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
import { formatCurrency, getTodayLocal } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function RecebimentoFormDialog({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [vendas, setVendas] = useState<any[]>([])
  const [formData, setFormData] = useState({
    venda_id: '',
    valor: '',
    data_recebimento: getTodayLocal(),
    tipo: 'avulso',
    forma_pagamento: 'pix',
    observacoes: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (open) loadVendas()
  }, [open])

  async function loadVendas() {
    const { data } = await supabase
      .from('vendas')
      .select('id, valor_total, desconto, data_venda, clientes(nome)')
      .in('status_pagamento', ['a_receber', 'sinal_pago'])
      .order('data_venda', { ascending: false })
    setVendas(data || [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        venda_id: formData.venda_id,
        valor: parseFloat(formData.valor) || 0,
        data_recebimento: formData.data_recebimento,
        tipo: formData.tipo,
        forma_pagamento: formData.forma_pagamento,
        observacoes: formData.observacoes || null,
      }

      const { error } = await supabase.from('recebimentos').insert(data)
      if (error) throw error

      toast.success('Recebimento registrado!')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
          <DialogDescription>Registre um recebimento manual de venda</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Venda *</Label>
            <Autocomplete
              options={vendas.map((v: any) => ({
                value: v.id,
                label: v.clientes?.nome || 'Sem cliente',
                description: `${new Date(v.data_venda).toLocaleDateString('pt-BR')} - ${formatCurrency(Number(v.valor_total) - Number(v.desconto || 0))}`,
              }))}
              value={formData.venda_id}
              onChange={(v) => setFormData({ ...formData, venda_id: v })}
              placeholder="Buscar venda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data_recebimento}
                onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="sinal">Sinal</SelectItem>
                  <SelectItem value="quitacao">Quitação</SelectItem>
                  <SelectItem value="parcela">Parcela</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
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
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
