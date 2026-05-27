'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Check, Edit, Trash2, Calendar, CalendarCheck, CalendarX, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AgendamentoFormDialog } from './agendamento-form-dialog'
import { ProjetoFormDialog } from './projeto-form-dialog'
import { formatDate, getTodayLocal, dateToLocalString } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [openProjetoDialog, setOpenProjetoDialog] = useState(false)
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null)
  const [agendamentoParaProjeto, setAgendamentoParaProjeto] = useState<any>(null)
  const [filtroPeriodo, setFiltroPeriodo] = useState('proximos_7')

  const supabase = createClient()

  async function loadAgendamentos() {
    setLoading(true)
    const hoje = getTodayLocal()
    let query = supabase
      .from('agendamentos')
      .select('*, clientes(nome)')
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (filtroPeriodo === 'hoje') {
      query = query.eq('data', hoje)
    } else if (filtroPeriodo === 'amanha') {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      query = query.eq('data', dateToLocalString(amanha))
    } else if (filtroPeriodo === 'semana') {
      const semana = new Date()
      semana.setDate(semana.getDate() + 7)
      query = query.gte('data', hoje).lte('data', dateToLocalString(semana))
    } else if (filtroPeriodo === 'proximos_7') {
      const futuro = new Date()
      futuro.setDate(futuro.getDate() + 7)
      query = query.gte('data', hoje).lte('data', dateToLocalString(futuro))
    }

    const { data, error } = await query

    if (error) {
      toast.error('Erro ao carregar agenda')
      console.error(error)
    } else {
      setAgendamentos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAgendamentos()
  }, [filtroPeriodo])

  // 🔴 Realtime: recarrega quando alguém da equipe adiciona/edita/exclui agendamento
  useRealtime('agendamentos', loadAgendamentos)

  async function handleCheck(agendamento: any) {
    if (agendamento.gravacao_realizada) {
      toast.info('Gravação já marcada como realizada')
      return
    }

    if (!confirm('Confirmar que a gravação foi realizada?')) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('agendamentos')
      .update({
        gravacao_realizada: true,
        data_check: new Date().toISOString(),
        checked_by: user?.id,
      })
      .eq('id', agendamento.id)

    if (error) {
      toast.error('Erro ao marcar check')
      return
    }

    // Atualizar status da venda
    if (agendamento.venda_id) {
      await supabase
        .from('vendas')
        .update({ status_servico: 'realizada' })
        .eq('id', agendamento.venda_id)
    }

    toast.success('Gravação confirmada! Abrindo formulário do projeto...')
    setAgendamentoParaProjeto(agendamento)
    setOpenProjetoDialog(true)
    loadAgendamentos()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este agendamento? Será removido também do Google Calendar.')) return

    // Sincronizar exclusão com Google primeiro
    try {
      await fetch('/api/agendamentos/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamento_id: id, action: 'delete' }),
      })
    } catch (err) {
      console.warn('Falha ao deletar do Google:', err)
    }

    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Agendamento excluído!')
      loadAgendamentos()
    }
  }

  // Agrupar por dia
  const agrupados = agendamentos.reduce((acc: any, ag) => {
    if (!acc[ag.data]) acc[ag.data] = []
    acc[ag.data].push(ag)
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">Gravações e compromissos</p>
        </div>
        <div className="flex gap-2">
          <Link href="/agenda/importar">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Importar do Google
            </Button>
          </Link>
          <Button onClick={() => { setEditingAgendamento(null); setOpenDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filtroPeriodo === 'hoje' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroPeriodo('hoje')}
        >
          Hoje
        </Button>
        <Button
          variant={filtroPeriodo === 'amanha' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroPeriodo('amanha')}
        >
          Amanhã
        </Button>
        <Button
          variant={filtroPeriodo === 'semana' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroPeriodo('semana')}
        >
          Esta Semana
        </Button>
        <Button
          variant={filtroPeriodo === 'proximos_7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltroPeriodo('proximos_7')}
        >
          Próximos 7 dias
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : Object.keys(agrupados).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            Nenhum agendamento no período. Clique em "Novo Agendamento" para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(agrupados).map(([data, lista]: any) => (
            <div key={data}>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                {formatDate(data, 'EEEE, dd \'de\' MMMM')}
              </h2>
              <div className="space-y-2">
                {lista.map((ag: any) => (
                  <Card key={ag.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <div className="text-2xl font-bold">{ag.hora_inicio.substring(0, 5)}</div>
                          <div className="text-xs text-muted-foreground">{ag.hora_fim.substring(0, 5)}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {ag.titulo}
                            {ag.google_event_id ? (
                              <span title="Sincronizado com Google Calendar">
                                <CalendarCheck className="h-4 w-4 text-green-600" />
                              </span>
                            ) : (
                              <span title="Não sincronizado com Google">
                                <CalendarX className="h-4 w-4 text-orange-500" />
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ag.clientes?.nome} {ag.estudio && `· ${ag.estudio}`}
                          </div>
                          {ag.observacoes && (
                            <div className="text-xs text-muted-foreground mt-1">{ag.observacoes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {ag.gravacao_realizada ? (
                            <Badge variant="default" className="bg-green-600">
                              <Check className="h-3 w-3 mr-1" />
                              Gravado
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleCheck(ag)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              CHECK
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingAgendamento(ag); setOpenDialog(true) }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(ag.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AgendamentoFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        agendamento={editingAgendamento}
        onSuccess={() => {
          setOpenDialog(false)
          loadAgendamentos()
        }}
      />

      <ProjetoFormDialog
        open={openProjetoDialog}
        onOpenChange={setOpenProjetoDialog}
        agendamento={agendamentoParaProjeto}
        onSuccess={() => {
          setOpenProjetoDialog(false)
          setAgendamentoParaProjeto(null)
        }}
      />
    </div>
  )
}
