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
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { addBusinessDays } from 'date-fns'
import { dateToLocalString } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agendamento?: any
  onSuccess: () => void
}

export function ProjetoFormDialog({ open, onOpenChange, agendamento, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [prazoPersonalizado, setPrazoPersonalizado] = useState(false)
  const [formData, setFormData] = useState({
    formato: 'podcast',
    tem_edicao: false,
    tem_cortes: false,
    quantidade_cortes: 0,
    tem_identidade_visual: false,
    tem_legendas: false,
    data_entrega_prevista: '',
    responsavel_id: '',
    arquivos_link: '',
    observacoes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (open && agendamento) {
      calcularPrazo(false)
      loadResponsaveis()
    }
  }, [open, agendamento])

  async function loadResponsaveis() {
    const { data } = await supabase
      .from('users_profile')
      .select('id, nome')
      .in('role', ['editor', 'admin'])
      .eq('ativo', true)
    setResponsaveis(data || [])
  }

  function calcularPrazo(temEdicao: boolean) {
    if (!agendamento) return
    const dias = temEdicao ? 5 : 3
    const dataGravacao = new Date(agendamento.data)
    const dataPrevista = addBusinessDays(dataGravacao, dias)
    setFormData(prev => ({
      ...prev,
      tem_edicao: temEdicao,
      data_entrega_prevista: dateToLocalString(dataPrevista),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agendamento) return
    setLoading(true)

    try {
      const data = {
        agendamento_id: agendamento.id,
        cliente_id: agendamento.cliente_id,
        venda_id: agendamento.venda_id,
        titulo: agendamento.titulo,
        formato: formData.formato,
        tem_edicao: formData.tem_edicao,
        tem_cortes: formData.tem_cortes,
        quantidade_cortes: formData.quantidade_cortes,
        tem_identidade_visual: formData.tem_identidade_visual,
        tem_legendas: formData.tem_legendas,
        data_gravacao: agendamento.data,
        data_entrega_prevista: formData.data_entrega_prevista,
        prazo_personalizado: prazoPersonalizado,
        responsavel_id: formData.responsavel_id || null,
        arquivos_link: formData.arquivos_link || null,
        observacoes: formData.observacoes || null,
        status: 'gravado',
      }

      const { error } = await supabase.from('projetos').insert(data)
      if (error) throw error

      toast.success('Projeto criado! Veja no Kanban.')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar projeto')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulário de Projeto</DialogTitle>
          <DialogDescription>
            Configure o projeto para gravação de "{agendamento?.titulo}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Formato *</Label>
            <Select
              value={formData.formato}
              onValueChange={(v) => setFormData({ ...formData, formato: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="podcast">Podcast</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="video_curso">Vídeo de Curso</SelectItem>
                <SelectItem value="video_institucional">Vídeo Institucional</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_edicao}
                onChange={(e) => calcularPrazo(e.target.checked)}
              />
              <span>Tem edição?</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_cortes}
                onChange={(e) => setFormData({ ...formData, tem_cortes: e.target.checked })}
              />
              <span>Pacote de cortes?</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_identidade_visual}
                onChange={(e) => setFormData({ ...formData, tem_identidade_visual: e.target.checked })}
              />
              <span>Identidade visual?</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_legendas}
                onChange={(e) => setFormData({ ...formData, tem_legendas: e.target.checked })}
              />
              <span>Legendas?</span>
            </label>
          </div>

          {formData.tem_cortes && (
            <div className="space-y-2">
              <Label>Quantidade de cortes</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantidade_cortes}
                onChange={(e) => setFormData({ ...formData, quantidade_cortes: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Prazo de Entrega</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPrazoPersonalizado(!prazoPersonalizado)}
              >
                {prazoPersonalizado ? 'Recalcular' : 'Personalizar'}
              </Button>
            </div>
            <Input
              type="date"
              value={formData.data_entrega_prevista}
              onChange={(e) => {
                setFormData({ ...formData, data_entrega_prevista: e.target.value })
                setPrazoPersonalizado(true)
              }}
              disabled={!prazoPersonalizado}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.tem_edicao ? '+5 dias úteis (com edição)' : '+3 dias úteis (sem edição)'}
            </p>
          </div>

          {responsaveis.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável pela edição</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Link dos arquivos brutos</Label>
            <Input
              type="url"
              value={formData.arquivos_link}
              onChange={(e) => setFormData({ ...formData, arquivos_link: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
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
              Pular por agora
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
