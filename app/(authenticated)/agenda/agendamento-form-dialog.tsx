'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Autocomplete } from '@/components/ui/autocomplete'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { getTodayLocal } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agendamento?: any
  onSuccess: () => void
}

export function AgendamentoFormDialog({ open, onOpenChange, agendamento, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [estudios, setEstudios] = useState<any[]>([])
  const [formData, setFormData] = useState({
    cliente_id: '',
    venda_id: '',
    titulo: '',
    data: getTodayLocal(),
    hora_inicio: '09:00',
    hora_fim: '11:00',
    estudio_id: '',
    estudio: '',
    tipo: 'gravacao',
    observacoes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  async function loadData() {
    const [{ data: cli }, { data: est }] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('estudios').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setClientes(cli || [])
    setEstudios(est || [])
  }

  async function loadVendasCliente(clienteId: string) {
    if (!clienteId) {
      setVendas([])
      return
    }
    const { data } = await supabase
      .from('vendas')
      .select('id, data_venda, valor_total')
      .eq('cliente_id', clienteId)
      .eq('status_servico', 'em_curso')
      .order('data_venda', { ascending: false })
    setVendas(data || [])
  }

  useEffect(() => {
    if (agendamento) {
      setFormData({
        cliente_id: agendamento.cliente_id || '',
        venda_id: agendamento.venda_id || '',
        titulo: agendamento.titulo || '',
        data: agendamento.data || getTodayLocal(),
        hora_inicio: agendamento.hora_inicio?.substring(0, 5) || '09:00',
        hora_fim: agendamento.hora_fim?.substring(0, 5) || '11:00',
        estudio_id: agendamento.estudio_id || '',
        estudio: agendamento.estudio || '',
        tipo: agendamento.tipo || 'gravacao',
        observacoes: agendamento.observacoes || '',
      })
      if (agendamento.cliente_id) loadVendasCliente(agendamento.cliente_id)
    } else {
      setFormData({
        cliente_id: '',
        venda_id: '',
        titulo: '',
        data: getTodayLocal(),
        hora_inicio: '09:00',
        hora_fim: '11:00',
        estudio_id: '',
        estudio: '',
        tipo: 'gravacao',
        observacoes: '',
      })
    }
  }, [agendamento, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Pegar nome do estúdio se estudio_id foi selecionado
      const estudioSelecionado = estudios.find(e => e.id === formData.estudio_id)

      const data = {
        cliente_id: formData.cliente_id,
        venda_id: formData.venda_id || null,
        titulo: formData.titulo,
        data: formData.data,
        hora_inicio: formData.hora_inicio,
        hora_fim: formData.hora_fim,
        estudio_id: formData.estudio_id || null,
        estudio: estudioSelecionado?.nome || formData.estudio || null,
        tipo: formData.tipo,
        observacoes: formData.observacoes || null,
      }

      let agendamentoId: string

      if (agendamento) {
        const { error } = await supabase
          .from('agendamentos')
          .update(data)
          .eq('id', agendamento.id)
        if (error) throw error
        agendamentoId = agendamento.id
        toast.success('Agendamento atualizado!')
      } else {
        const { data: novo, error } = await supabase
          .from('agendamentos')
          .insert(data)
          .select()
          .single()
        if (error) throw error
        agendamentoId = novo.id
        toast.success('Agendamento criado!')
      }

      // Sincronizar com Google Calendar (não bloqueia se falhar)
      try {
        const syncRes = await fetch('/api/agendamentos/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agendamento_id: agendamentoId,
            action: agendamento ? 'update' : 'create',
          }),
        })
        const syncData = await syncRes.json()
        if (syncData.synced) {
          toast.success('Sincronizado com Google Calendar!')
        } else if (syncData.error && !syncData.error.includes('Sem conexão')) {
          toast.warning(`Aviso: ${syncData.error}`)
        }
      } catch (syncErr) {
        console.warn('Sync Google falhou:', syncErr)
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agendamento ? 'Editar' : 'Novo'} Agendamento</DialogTitle>
          <DialogDescription>Preencha os dados do agendamento</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Autocomplete
              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
              value={formData.cliente_id}
              onChange={(v) => {
                setFormData({ ...formData, cliente_id: v, venda_id: '' })
                loadVendasCliente(v)
              }}
              placeholder="Buscar cliente..."
            />
          </div>

          {vendas.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a Venda (opcional)</Label>
              <Autocomplete
                options={vendas.map(v => ({
                  value: v.id,
                  label: `Venda ${new Date(v.data_venda).toLocaleDateString('pt-BR')}`,
                  description: `R$ ${Number(v.valor_total).toFixed(2)}`,
                }))}
                value={formData.venda_id}
                onChange={(v) => setFormData({ ...formData, venda_id: v })}
                placeholder="Nenhuma venda vinculada"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Podcast - João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Início *</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fim *</Label>
              <Input
                type="time"
                value={formData.hora_fim}
                onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estúdio</Label>
              {estudios.length > 0 ? (
                <Autocomplete
                  options={estudios.map(e => ({ value: e.id, label: e.nome }))}
                  value={formData.estudio_id}
                  onChange={(v) => setFormData({ ...formData, estudio_id: v })}
                  placeholder="Selecionar estúdio"
                  emptyMessage="Cadastre estúdios em Configurações"
                />
              ) : (
                <Input
                  value={formData.estudio}
                  onChange={(e) => setFormData({ ...formData, estudio: e.target.value })}
                  placeholder="Cadastre em Configurações → Estúdios"
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gravacao">Gravação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
