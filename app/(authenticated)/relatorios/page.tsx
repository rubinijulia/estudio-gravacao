'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BarChart3, TrendingUp, Users, Award, FileDown, FileSpreadsheet, Filter } from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, dateToLocalString } from '@/lib/formatters'
import { toast } from 'sonner'
import { exportarRelatorioGeralPDF, exportarRelatorioGeralCSV } from '@/lib/export-relatorio-geral'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type PeriodoPreset = '30d' | 'mes_atual' | 'mes_passado' | 'trimestre' | 'ano' | 'personalizado'

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true)
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('30d')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [vendasMes, setVendasMes] = useState<any[]>([])
  const [topClientes, setTopClientes] = useState<any[]>([])
  const [projetosStatus, setProjetosStatus] = useState<any[]>([])
  const [performanceEquipe, setPerformanceEquipe] = useState<any[]>([])
  const [conversao, setConversao] = useState({
    em_curso: 0,
    realizada: 0,
    cancelada: 0,
    taxa: 0,
  })
  const [totalVendido, setTotalVendido] = useState(0)
  const [totalRecebido, setTotalRecebido] = useState(0)

  const supabase = createClient()

  function calcularPeriodo(preset: PeriodoPreset): { inicio: string; fim: string } {
    const hoje = new Date()
    const fim = dateToLocalString(hoje)

    switch (preset) {
      case '30d': {
        const inicio = new Date()
        inicio.setDate(inicio.getDate() - 30)
        return { inicio: dateToLocalString(inicio), fim }
      }
      case 'mes_atual': {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        return { inicio: dateToLocalString(inicio), fim }
      }
      case 'mes_passado': {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        return {
          inicio: dateToLocalString(inicio),
          fim: dateToLocalString(fimMes),
        }
      }
      case 'trimestre': {
        const inicio = new Date()
        inicio.setMonth(inicio.getMonth() - 3)
        return { inicio: dateToLocalString(inicio), fim }
      }
      case 'ano': {
        const inicio = new Date(hoje.getFullYear(), 0, 1)
        return { inicio: dateToLocalString(inicio), fim }
      }
      default:
        return { inicio: dataInicio, fim: dataFim }
    }
  }

  function aplicarPreset(preset: PeriodoPreset) {
    setPeriodoPreset(preset)
    if (preset !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(preset)
      setDataInicio(inicio)
      setDataFim(fim)
    }
  }

  async function loadData() {
    if (!dataInicio || !dataFim) return

    setLoading(true)

    try {
      const { data: vendas } = await supabase
        .from('vendas')
        .select('*, clientes(nome)')
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)
        .neq('status_pagamento', 'cancelado')

      // Agrupar por mês
      const mesesMap: Record<string, { mes: string; vendido: number; recebido: number; count: number }> = {}
      ;(vendas || []).forEach(v => {
        const data = new Date(v.data_venda)
        const key = `${data.getFullYear()}-${String(data.getMonth()).padStart(2, '0')}`
        if (!mesesMap[key]) {
          mesesMap[key] = {
            mes: `${MESES[data.getMonth()]}/${String(data.getFullYear()).substring(2)}`,
            vendido: 0,
            recebido: 0,
            count: 0,
          }
        }
        const valor = Number(v.valor_total) - Number(v.desconto || 0)
        mesesMap[key].vendido += valor
        mesesMap[key].count++
        if (v.status_pagamento === 'totalmente_recebido') {
          mesesMap[key].recebido += valor
        } else if (v.status_pagamento === 'sinal_pago') {
          mesesMap[key].recebido += Number(v.valor_sinal || 0)
        }
      })

      const vendasMesArr = Object.entries(mesesMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, v]) => v)
      setVendasMes(vendasMesArr)

      const totalV = vendasMesArr.reduce((s, m) => s + m.vendido, 0)
      const totalR = vendasMesArr.reduce((s, m) => s + m.recebido, 0)
      setTotalVendido(totalV)
      setTotalRecebido(totalR)

      // Top Clientes
      const clientesMap: Record<string, { nome: string; total: number; count: number }> = {}
      ;(vendas || []).forEach(v => {
        if (!v.clientes?.nome) return
        if (!clientesMap[v.cliente_id]) {
          clientesMap[v.cliente_id] = { nome: v.clientes.nome, total: 0, count: 0 }
        }
        clientesMap[v.cliente_id].total += Number(v.valor_total) - Number(v.desconto || 0)
        clientesMap[v.cliente_id].count++
      })
      const ranking = Object.values(clientesMap).sort((a, b) => b.total - a.total).slice(0, 10)
      setTopClientes(ranking)

      // Projetos por status (no período)
      const { data: projetos } = await supabase
        .from('projetos')
        .select('status, created_at')
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim + 'T23:59:59')

      const statusMap: Record<string, number> = {}
      ;(projetos || []).forEach(p => {
        statusMap[p.status] = (statusMap[p.status] || 0) + 1
      })
      setProjetosStatus(Object.entries(statusMap).map(([name, value]) => ({ name, value })))

      // Performance equipe
      const { data: projComResp } = await supabase
        .from('projetos')
        .select('responsavel_id, status, data_entrega_prevista, data_entrega_real, users_profile(nome), created_at')
        .gte('created_at', dataInicio)
        .lte('created_at', dataFim + 'T23:59:59')

      const equipeMap: Record<string, any> = {}
      ;(projComResp || []).forEach((p: any) => {
        if (!p.responsavel_id || !p.users_profile?.nome) return
        if (!equipeMap[p.responsavel_id]) {
          equipeMap[p.responsavel_id] = {
            nome: p.users_profile.nome,
            total: 0,
            finalizados: 0,
            no_prazo: 0,
            atrasados: 0,
          }
        }
        equipeMap[p.responsavel_id].total++
        if (p.status === 'finalizado') {
          equipeMap[p.responsavel_id].finalizados++
          if (p.data_entrega_real && p.data_entrega_prevista) {
            if (new Date(p.data_entrega_real) <= new Date(p.data_entrega_prevista)) {
              equipeMap[p.responsavel_id].no_prazo++
            } else {
              equipeMap[p.responsavel_id].atrasados++
            }
          }
        }
      })
      setPerformanceEquipe(Object.values(equipeMap))

      // Taxa de conversão (no período)
      const { data: todasVendas } = await supabase
        .from('vendas')
        .select('status_servico')
        .gte('data_venda', dataInicio)
        .lte('data_venda', dataFim)
      const conv = { em_curso: 0, realizada: 0, cancelada: 0, taxa: 0 }
      ;(todasVendas || []).forEach(v => {
        if (v.status_servico === 'em_curso') conv.em_curso++
        else if (v.status_servico === 'realizada') conv.realizada++
        else if (v.status_servico === 'cancelada') conv.cancelada++
      })
      const totalRelevante = conv.realizada + conv.cancelada
      conv.taxa = totalRelevante > 0 ? Math.round((conv.realizada / totalRelevante) * 100) : 0
      setConversao(conv)

    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    aplicarPreset('30d')
  }, [])

  useEffect(() => {
    if (dataInicio && dataFim) loadData()
  }, [dataInicio, dataFim])

  function exportarPDF() {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione um período')
      return
    }
    exportarRelatorioGeralPDF({
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      vendasMes,
      topClientes,
      projetosStatus,
      performanceEquipe,
      conversao,
      totalVendido,
      totalRecebido,
    })
    toast.success('PDF gerado!')
  }

  function exportarCSV() {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione um período')
      return
    }
    exportarRelatorioGeralCSV({
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      vendasMes,
      topClientes,
      projetosStatus,
      performanceEquipe,
      conversao,
      totalVendido,
      totalRecebido,
    })
    toast.success('CSV gerado!')
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análises e métricas do negócio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarCSV} disabled={loading}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={exportarPDF} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filtros de período */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período do Relatório</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={periodoPreset === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => aplicarPreset('30d')}
            >
              Últimos 30 dias
            </Button>
            <Button
              variant={periodoPreset === 'mes_atual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => aplicarPreset('mes_atual')}
            >
              Este mês
            </Button>
            <Button
              variant={periodoPreset === 'mes_passado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => aplicarPreset('mes_passado')}
            >
              Mês passado
            </Button>
            <Button
              variant={periodoPreset === 'trimestre' ? 'default' : 'outline'}
              size="sm"
              onClick={() => aplicarPreset('trimestre')}
            >
              Últimos 3 meses
            </Button>
            <Button
              variant={periodoPreset === 'ano' ? 'default' : 'outline'}
              size="sm"
              onClick={() => aplicarPreset('ano')}
            >
              Este ano
            </Button>
            <Button
              variant={periodoPreset === 'personalizado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoPreset('personalizado')}
            >
              Personalizado
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-1">
              <Label className="text-xs">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value)
                  setPeriodoPreset('personalizado')
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value)
                  setPeriodoPreset('personalizado')
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Carregando dados do período...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="vendas">
          <TabsList>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
          </TabsList>

          {/* VENDAS */}
          <TabsContent value="vendas" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Vendido (período)</CardDescription>
                  <CardTitle className="text-2xl">{formatCurrency(totalVendido)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Recebido (período)</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{formatCurrency(totalRecebido)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Taxa de Conversão</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">{conversao.taxa}%</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Vendas por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendasMes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem vendas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={vendasMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="vendido" fill="#0ea5e9" name="Vendido" />
                      <Bar dataKey="recebido" fill="#10b981" name="Recebido" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quantidade de Vendas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                {vendasMes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem vendas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={vendasMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} name="Vendas" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLIENTES */}
          <TabsContent value="clientes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top 10 Clientes
                </CardTitle>
                <CardDescription>Por valor total comprado no período</CardDescription>
              </CardHeader>
              <CardContent>
                {topClientes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topClientes} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="nome" type="category" width={120} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="total" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROJETOS */}
          <TabsContent value="projetos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Projetos por Status
                </CardTitle>
                <CardDescription>Projetos criados no período</CardDescription>
              </CardHeader>
              <CardContent>
                {projetosStatus.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem projetos no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={projetosStatus}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {projetosStatus.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EQUIPE */}
          <TabsContent value="equipe" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance da Equipe
                </CardTitle>
                <CardDescription>Projetos no período por responsável</CardDescription>
              </CardHeader>
              <CardContent>
                {performanceEquipe.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem dados de equipe no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceEquipe}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#0ea5e9" name="Total projetos" />
                      <Bar dataKey="finalizados" fill="#10b981" name="Finalizados" />
                      <Bar dataKey="no_prazo" fill="#22c55e" name="No prazo" />
                      <Bar dataKey="atrasados" fill="#ef4444" name="Atrasados" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
