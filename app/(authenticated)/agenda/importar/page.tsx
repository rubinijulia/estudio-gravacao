'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Autocomplete } from '@/components/ui/autocomplete'
import { ArrowLeft, Download, Calendar, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDate, formatDateTime } from '@/lib/formatters'

export default function ImportarAgendamentosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [jaImportados, setJaImportados] = useState(0)
  const [clientes, setClientes] = useState<any[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [vinculacoes, setVinculacoes] = useState<Record<string, string>>({})

  const supabase = createClient()

  async function carregarEventos() {
    setLoading(true)
    try {
      const [{ data: cli }, res] = await Promise.all([
        supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
        fetch('/api/google/import-events'),
      ])

      setClientes(cli || [])

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao buscar eventos')
        return
      }

      setEvents(data.events || [])
      setJaImportados(data.ja_importados || 0)

      // Tenta vincular automaticamente por nome
      const autoVinc: Record<string, string> = {}
      ;(data.events || []).forEach((evt: any) => {
        const tituloLower = (evt.titulo || '').toLowerCase()
        const match = (cli || []).find(c => tituloLower.includes(c.nome.toLowerCase()))
        if (match) autoVinc[evt.google_event_id] = match.id
      })
      setVinculacoes(autoVinc)

      // Marca todos por padrão
      setSelecionados(new Set((data.events || []).map((e: any) => e.google_event_id)))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar eventos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarEventos()
  }, [])

  function toggleSelecionado(eventId: string) {
    const novo = new Set(selecionados)
    if (novo.has(eventId)) novo.delete(eventId)
    else novo.add(eventId)
    setSelecionados(novo)
  }

  function selecionarTodos() {
    setSelecionados(new Set(events.map(e => e.google_event_id)))
  }

  function desmarcarTodos() {
    setSelecionados(new Set())
  }

  async function importar() {
    if (selecionados.size === 0) {
      toast.error('Selecione pelo menos um evento')
      return
    }

    setImporting(true)
    try {
      const eventosParaImportar = events
        .filter(e => selecionados.has(e.google_event_id))
        .map(e => ({
          ...e,
          cliente_id: vinculacoes[e.google_event_id] || null,
        }))

      const res = await fetch('/api/google/import-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventosParaImportar }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`${data.importados} agendamento${data.importados > 1 ? 's' : ''} importado${data.importados > 1 ? 's' : ''}!`)

      if (data.erros > 0) {
        toast.warning(`${data.erros} evento${data.erros > 1 ? 's' : ''} com erro`)
      }

      setTimeout(() => router.push('/agenda'), 1000)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/agenda" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" />
          Voltar para Agenda
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Download className="h-7 w-7" />
          Importar do Google Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Eventos futuros dos seus estúdios no Google Calendar
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Buscando eventos no Google Calendar...</p>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">Nenhum evento novo para importar</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {jaImportados > 0
                ? `Todos os ${jaImportados} eventos do seu Google Calendar já foram importados.`
                : 'Não há eventos futuros nos calendários vinculados aos seus estúdios.'}
            </p>
            <Button variant="outline" onClick={carregarEventos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar lista
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {events.length} evento{events.length > 1 ? 's' : ''} encontrado{events.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''} para importação
                  {jaImportados > 0 && ` · ${jaImportados} já estavam importados`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selecionarTodos}>
                  Selecionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={desmarcarTodos}>
                  Desmarcar todos
                </Button>
                <Button variant="outline" size="sm" onClick={carregarEventos}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de eventos */}
          <div className="space-y-2 mb-6">
            {events.map((evt) => {
              const selecionado = selecionados.has(evt.google_event_id)
              const clienteVinculado = vinculacoes[evt.google_event_id]
              const cliente = clientes.find(c => c.id === clienteVinculado)

              return (
                <Card
                  key={evt.google_event_id}
                  className={selecionado ? 'border-blue-300 bg-blue-50/50' : 'opacity-70'}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => toggleSelecionado(evt.google_event_id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{evt.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(evt.start)} → {new Date(evt.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <Badge variant="secondary">{evt.estudio_nome}</Badge>
                        </div>

                        {selecionado && (
                          <div className="pt-2 border-t">
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Vincular ao cliente:
                            </label>
                            <Autocomplete
                              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                              value={clienteVinculado || ''}
                              onChange={(v) => setVinculacoes({ ...vinculacoes, [evt.google_event_id]: v })}
                              placeholder="Deixe vazio para criar cliente novo automaticamente"
                            />
                            {!cliente && (
                              <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Cliente "{evt.titulo}" será criado automaticamente (cadastro incompleto)
                              </p>
                            )}
                            {cliente && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Vinculado a: {cliente.nome}
                              </p>
                            )}
                          </div>
                        )}

                        {evt.descricao && (
                          <div className="text-xs text-muted-foreground">{evt.descricao}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Botão importar */}
          <div className="sticky bottom-4 bg-white border rounded-lg p-4 shadow-lg flex justify-between items-center">
            <div className="text-sm">
              <strong>{selecionados.size}</strong> de <strong>{events.length}</strong> eventos selecionados
            </div>
            <Button
              size="lg"
              onClick={importar}
              disabled={importing || selecionados.size === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar {selecionados.size} agendamento{selecionados.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
