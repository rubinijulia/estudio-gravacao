'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Plus, Edit, Trash2, Calendar, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EstudiosPage() {
  const [estudios, setEstudios] = useState<any[]>([])
  const [calendars, setCalendars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    google_calendar_id: '',
    cor: '',
    ativo: true,
  })

  const supabase = createClient()

  async function loadEstudios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('estudios')
      .select('*')
      .order('nome')

    if (error) toast.error('Erro ao carregar estúdios')
    else setEstudios(data || [])
    setLoading(false)
  }

  async function loadCalendars() {
    setLoadingCalendars(true)
    try {
      const statusRes = await fetch('/api/google/status')
      const statusData = await statusRes.json()
      setGoogleConnected(statusData.connected)

      if (statusData.connected) {
        const res = await fetch('/api/google/calendars')
        const data = await res.json()
        if (data.calendars) setCalendars(data.calendars)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCalendars(false)
    }
  }

  useEffect(() => {
    loadEstudios()
    loadCalendars()
  }, [])

  useEffect(() => {
    if (editing) {
      setFormData({
        nome: editing.nome || '',
        descricao: editing.descricao || '',
        google_calendar_id: editing.google_calendar_id || '',
        cor: editing.cor || '',
        ativo: editing.ativo ?? true,
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        google_calendar_id: '',
        cor: '',
        ativo: true,
      })
    }
  }, [editing, openDialog])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        google_calendar_id: formData.google_calendar_id || null,
        descricao: formData.descricao || null,
        cor: formData.cor || null,
      }

      if (editing) {
        const { error } = await supabase.from('estudios').update(data).eq('id', editing.id)
        if (error) throw error
        toast.success('Estúdio atualizado!')
      } else {
        const { error } = await supabase.from('estudios').insert(data)
        if (error) throw error
        toast.success('Estúdio criado!')
      }
      setOpenDialog(false)
      loadEstudios()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este estúdio? Agendamentos vinculados ficarão sem estúdio.')) return
    const { error } = await supabase.from('estudios').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluído!'); loadEstudios() }
  }

  function getCalendarNome(id: string) {
    const cal = calendars.find(c => c.id === id)
    return cal?.summary || 'Calendário não encontrado'
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            Estúdios
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre seus estúdios e vincule cada um a um calendário Google
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Estúdio
        </Button>
      </div>

      {!googleConnected && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">
                Google Calendar não conectado. Conecte para vincular calendários aos estúdios.
              </span>
            </div>
            <Link href="/configuracoes/google-calendar">
              <Button variant="outline" size="sm">Conectar</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {googleConnected && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm">
                Google Calendar conectado · {calendars.length} calendário{calendars.length !== 1 ? 's' : ''} disponíve{calendars.length !== 1 ? 'is' : 'l'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={loadCalendars} disabled={loadingCalendars}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingCalendars ? 'animate-spin' : ''}`} />
              Atualizar lista
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : estudios.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum estúdio cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Calendário Google</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudios.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {e.cor && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.cor }} />
                        )}
                        {e.nome}
                      </div>
                      {e.descricao && (
                        <div className="text-xs text-muted-foreground">{e.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.google_calendar_id ? (
                        <Badge variant="default" className="bg-blue-600">
                          <Calendar className="h-3 w-3 mr-1" />
                          {getCalendarNome(e.google_calendar_id)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Não vinculado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.ativo ? 'default' : 'secondary'}>
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setOpenDialog(true) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} Estúdio</DialogTitle>
            <DialogDescription>
              Configure o estúdio e vincule a um calendário Google
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Estúdio Flow"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Calendário Google</Label>
              {!googleConnected ? (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs">
                  Conecte o Google Calendar primeiro para escolher um calendário
                </div>
              ) : calendars.length === 0 ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                  Nenhum calendário encontrado
                </div>
              ) : (
                <Select
                  value={formData.google_calendar_id || 'none'}
                  onValueChange={(v) => {
                    const cal = calendars.find(c => c.id === v)
                    setFormData({
                      ...formData,
                      google_calendar_id: v === 'none' ? '' : v,
                      cor: cal?.backgroundColor || formData.cor,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um calendário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vinculação</SelectItem>
                    {calendars.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          {c.backgroundColor && (
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.backgroundColor }} />
                          )}
                          {c.summary}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Cor (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.cor || '#999999'}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20"
                />
                <Input
                  value={formData.cor || ''}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="ativo">Estúdio ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
