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
import { getTodayLocal } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  custo?: any
  onSuccess: () => void
}

export function CustoFixoFormDialog({ open, onOpenChange, custo, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'outros',
    valor: '',
    dia_vencimento: '',
    ativo: true,
    observacoes: '',
    data_inicio: getTodayLocal(),
    data_fim: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (custo) {
      setFormData({
        nome: custo.nome || '',
        categoria: custo.categoria || 'outros',
        valor: String(custo.valor || ''),
        dia_vencimento: String(custo.dia_vencimento || ''),
        ativo: custo.ativo ?? true,
        observacoes: custo.observacoes || '',
        data_inicio: custo.data_inicio || getTodayLocal(),
        data_fim: custo.data_fim || '',
      })
    } else {
      setFormData({
        nome: '',
        categoria: 'outros',
        valor: '',
        dia_vencimento: '',
        ativo: true,
        observacoes: '',
        data_inicio: getTodayLocal(),
        data_fim: '',
      })
    }
  }, [custo, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        nome: formData.nome,
        categoria: formData.categoria,
        valor: parseFloat(formData.valor) || 0,
        dia_vencimento: formData.dia_vencimento ? parseInt(formData.dia_vencimento) : null,
        ativo: formData.ativo,
        observacoes: formData.observacoes || null,
        data_inicio: formData.data_inicio,
        data_fim: formData.data_fim || null,
      }

      if (custo) {
        const { error } = await supabase.from('custos_fixos').update(data).eq('id', custo.id)
        if (error) throw error
        toast.success('Custo atualizado!')
      } else {
        const { error } = await supabase.from('custos_fixos').insert(data)
        if (error) throw error
        toast.success('Custo cadastrado!')
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{custo ? 'Editar' : 'Novo'} Custo Fixo</DialogTitle>
          <DialogDescription>Custos recorrentes mensais</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Aluguel, Internet..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                  <SelectItem value="pro_labore">Pró-labore</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="contabilidade">Contabilidade</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dia do Vencimento (1-31)</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={formData.dia_vencimento}
              onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
              placeholder="Ex: 10"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <p className="text-xs font-semibold">📆 Vigência (em quais meses esse custo aparece)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data início *</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  placeholder="Vazio = sem fim"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe a data fim vazia se o custo é contínuo. Use a data fim se cancelar/encerrar em um mês específico.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="ativo">Custo ativo</Label>
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
