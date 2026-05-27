'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle, Calendar, TrendingUp, DollarSign, UserX, FileDown } from 'lucide-react'
import { formatCurrency, formatDate, getDaysUntilDate, getTodayLocal, dateToLocalString } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'
import { isCadastroCompleto, camposFaltando } from '@/lib/cliente'
import { toast } from 'sonner'
import Link from 'next/link'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [vendaMes, setVendaMes] = useState(0)
  const [recebidoMes, setRecebidoMes] = useState(0)
  const [aReceber, setAReceber] = useState(0)
  const [meta, setMeta] = useState(0)
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([])
  const [entregasHoje, setEntregasHoje] = useState<any[]>([])
  const [atrasos, setAtrasos] = useState<any[]>([])
  const [clientesIncompletos, setClientesIncompletos] = useState<any[]>([])
  const [mostrarFechamentoMes, setMostrarFechamentoMes] = useState(false)
  const [competenciaFechamento, setCompetenciaFechamento] = useState('')
  const [pagamentosCobrar, setPagamentosCobrar] = useState<any[]>([])
  const [nfsParaEmitir, setNfsParaEmitir] = useState<any[]>([])

  const supabase = createClient()

  async function loadDashboard() {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const hoje = getTodayLocal()
      const inicioMes = new Date()
      inicioMes.setDate(1)
      const inicioMesStr = dateToLocalString(inicioMes)

      // Vendas do mês
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*')
        .gte('data_venda', inicioMesStr)
        .neq('status_pagamento', 'cancelado')

      const totalVendas = (vendas || []).reduce(
        (sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)),
        0
      )
      setVendaMes(totalVendas)

      const totalRecebido = (vendas || [])
        .filter(v => v.status_pagamento === 'totalmente_recebido')
        .reduce((sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)), 0)
        + (vendas || [])
          .filter(v => v.status_pagamento === 'sinal_pago')
          .reduce((sum, v) => sum + Number(v.valor_sinal || 0), 0)
      setRecebidoMes(totalRecebido)

      const totalAReceber = (vendas || [])
        .filter(v => ['a_receber', 'sinal_pago'].includes(v.status_pagamento))
        .reduce((sum, v) => {
          const total = Number(v.valor_total) - Number(v.desconto || 0)
          const sinal = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
          return sum + (total - sinal)
        }, 0)
      setAReceber(totalAReceber)

      // Meta
      const { data: metaData } = await supabase
        .from('metas')
        .select('*')
        .eq('competencia', inicioMesStr)
        .single()
      setMeta(metaData?.meta_vendas || 0)

      // Agendamentos de hoje
      const { data: ags } = await supabase
        .from('agendamentos')
        .select('*, clientes(nome)')
        .eq('data', hoje)
        .order('hora_inicio')
      setAgendamentosHoje(ags || [])

      // Entregas de hoje
      const { data: ents } = await supabase
        .from('projetos')
        .select('*, clientes(nome)')
        .eq('data_entrega_prevista', hoje)
        .neq('status', 'finalizado')
      setEntregasHoje(ents || [])

      // Atrasos
      const { data: atr } = await supabase
        .from('projetos')
        .select('*, clientes(nome)')
        .lt('data_entrega_prevista', hoje)
        .neq('status', 'finalizado')
        .order('data_entrega_prevista')
      setAtrasos(atr || [])

      // Pagamentos para cobrar (gravação há +5 dias sem pagamento total)
      const cincoDiasAtras = new Date()
      cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5)
      const cincoDiasAtrasStr = dateToLocalString(cincoDiasAtras)

      const { data: cobrar } = await supabase
        .from('vendas')
        .select('*, clientes(nome)')
        .eq('status_servico', 'realizada')
        .in('status_pagamento', ['a_receber', 'sinal_pago'])
        .lte('data_venda', cincoDiasAtrasStr)
        .order('data_venda')
      setPagamentosCobrar(cobrar || [])

      // NFs para emitir
      const { data: nfs } = await supabase
        .from('vendas')
        .select('*, clientes(nome)')
        .eq('nf_emitida', false)
        .neq('status_pagamento', 'cancelado')
        .order('data_venda')
      setNfsParaEmitir(nfs || [])

      // Cadastros incompletos (detecta automaticamente pelos campos faltando)
      const { data: todosClientes } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })

      const incompletos = (todosClientes || [])
        .filter(c => !isCadastroCompleto(c))
        .map(c => ({
          ...c,
          faltam: camposFaltando(c),
        }))

      setClientesIncompletos(incompletos)

      // Verificar se deve mostrar alerta de fechamento (primeiros 10 dias do mês)
      const diaAtual = new Date().getDate()
      if (diaAtual <= 10) {
        const mesAnterior = new Date()
        mesAnterior.setMonth(mesAnterior.getMonth() - 1)
        const competenciaMesAnt = mesAnterior.toISOString().substring(0, 7)
        setCompetenciaFechamento(competenciaMesAnt)
        setMostrarFechamentoMes(true)
      }

    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  // 🔴 Realtime: dashboard atualiza quando muda agendamento, venda ou projeto
  useRealtime('agendamentos', loadDashboard)
  useRealtime('vendas', loadDashboard)
  useRealtime('projetos', loadDashboard)

  async function handleCheck(ag: any) {
    if (!confirm('Confirmar gravação?')) return
    const { error } = await supabase
      .from('agendamentos')
      .update({
        gravacao_realizada: true,
        data_check: new Date().toISOString(),
        checked_by: user?.id,
      })
      .eq('id', ag.id)

    if (error) {
      toast.error('Erro ao marcar check')
      return
    }

    if (ag.venda_id) {
      await supabase.from('vendas').update({ status_servico: 'realizada' }).eq('id', ag.venda_id)
    }

    toast.success('Gravação confirmada! Vá em Agenda para criar o projeto.')
    loadDashboard()
  }

  const percentualMeta = meta > 0 ? Math.round((vendaMes / meta) * 100) : 0

  if (loading) {
    return <div className="p-8">Carregando dashboard...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Olá, {user?.email}! Visão geral do estúdio.
        </p>
      </div>

      {/* Termômetro de Vendas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardDescription>Vendido no mês</CardDescription>
              <CardTitle className="text-4xl font-bold">{formatCurrency(vendaMes)}</CardTitle>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardHeader>
        <CardContent>
          {meta > 0 ? (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span>Meta: {formatCurrency(meta)}</span>
                <span className="font-semibold">{percentualMeta}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                  style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem meta definida. Configure em Configurações.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerta de fechamento do mês anterior */}
      {mostrarFechamentoMes && competenciaFechamento && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <FileDown className="h-5 w-5" />
              Hora de fechar o mês de {new Date(competenciaFechamento + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <CardDescription className="text-blue-700/80">
              Gere o relatório consolidado do mês anterior em PDF ou Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href={`/financeiro?mes=${competenciaFechamento}`}>
              <Button>
                <FileDown className="h-4 w-4 mr-2" />
                Ir para Fechamento
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setMostrarFechamentoMes(false)}>
              Dispensar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 🔍 CONFIRMAR PAGAMENTO */}
      {pagamentosCobrar.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              🔍 {pagamentosCobrar.length} pagamento{pagamentosCobrar.length > 1 ? 's' : ''} para confirmar
            </CardTitle>
            <CardDescription className="text-yellow-700/80">
              Gravação há +5 dias sem baixa total - verificar se já recebemos (pode ser só falta de atualizar no sistema)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pagamentosCobrar.slice(0, 5).map((v: any) => {
                const total = Number(v.valor_total) - Number(v.desconto || 0)
                const pago = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
                const pendente = total - pago
                const dias = Math.floor((new Date().getTime() - new Date(v.data_venda + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <Link
                    key={v.id}
                    href="/vendas"
                    className="flex items-center justify-between p-3 bg-white border border-yellow-300 rounded-lg hover:bg-yellow-100"
                  >
                    <div>
                      <div className="font-medium text-sm">{v.clientes?.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {dias} dias da venda · {v.status_pagamento === 'sinal_pago' ? 'Sinal pago' : 'A receber'}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-yellow-800">
                      {formatCurrency(pendente)}
                    </div>
                  </Link>
                )
              })}
              {pagamentosCobrar.length > 5 && (
                <Link href="/vendas" className="text-xs text-yellow-800 hover:underline block text-center">
                  Ver mais {pagamentosCobrar.length - 5} para confirmar
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📄 NFs PARA EMITIR */}
      {nfsParaEmitir.length > 0 && (
        <Card className="border-purple-300 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              📄 {nfsParaEmitir.length} NF{nfsParaEmitir.length > 1 ? 's' : ''} para emitir
            </CardTitle>
            <CardDescription className="text-purple-700/80">
              Vendas sem nota fiscal emitida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nfsParaEmitir.slice(0, 5).map((v: any) => {
                const valor = Number(v.valor_total) - Number(v.desconto || 0)
                return (
                  <Link
                    key={v.id}
                    href="/vendas"
                    className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-100"
                  >
                    <div>
                      <div className="font-medium text-sm">{v.clientes?.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        Venda {new Date(v.data_venda + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-purple-700">
                      {formatCurrency(valor)}
                    </div>
                  </Link>
                )
              })}
              {nfsParaEmitir.length > 5 && (
                <Link href="/vendas" className="text-xs text-purple-700 hover:underline block text-center">
                  Ver mais {nfsParaEmitir.length - 5} NFs
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription>Recebido (mês)</CardDescription>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(recebidoMes)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Receber</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{formatCurrency(aReceber)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Atrasos</CardDescription>
            <CardTitle className="text-2xl text-red-600">{atrasos.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fila do Estúdio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Gravações de Hoje
            </CardTitle>
            <CardDescription>Fila do estúdio</CardDescription>
          </CardHeader>
          <CardContent>
            {agendamentosHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma gravação para hoje</p>
            ) : (
              <div className="space-y-2">
                {agendamentosHoje.map(ag => (
                  <div key={ag.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="font-mono text-sm font-bold min-w-[60px]">
                      {ag.hora_inicio.substring(0, 5)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{ag.clientes?.nome}</div>
                      <div className="text-xs text-muted-foreground">{ag.titulo}</div>
                    </div>
                    {ag.gravacao_realizada ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        OK
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleCheck(ag)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entregas e Atrasos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Entregas e Atrasos
            </CardTitle>
            <CardDescription>Atenção necessária</CardDescription>
          </CardHeader>
          <CardContent>
            {entregasHoje.length === 0 && atrasos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo em dia! 🎉</p>
            ) : (
              <div className="space-y-2">
                {atrasos.map(p => {
                  const dias = Math.abs(getDaysUntilDate(new Date(p.data_entrega_prevista)))
                  return (
                    <Link
                      key={p.id}
                      href="/projetos"
                      className="flex items-center gap-3 p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{p.clientes?.nome}</div>
                        <div className="text-xs text-red-600">
                          Atrasado {dias} dia{dias > 1 ? 's' : ''}
                        </div>
                      </div>
                    </Link>
                  )
                })}
                {entregasHoje.map(p => (
                  <Link
                    key={p.id}
                    href="/projetos"
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted"
                  >
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.clientes?.nome}</div>
                      <div className="text-xs text-muted-foreground">Entrega hoje</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
