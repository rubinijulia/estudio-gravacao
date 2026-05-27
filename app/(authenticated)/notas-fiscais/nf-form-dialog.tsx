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
import { getTodayLocal, formatCurrency } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nf?: any
  onSuccess: () => void
}

export function NfFormDialog({ open, onOpenChange, nf, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [aliquota, setAliquota] = useState(6) // padrão
  const [formData, setFormData] = useState({
    cliente_id: '',
    venda_id: '',
    numero: '',
    serie: '',
    data_emissao: getTodayLocal(),
    valor: '',
    valor_imposto: '',
    status: 'pendente',
    descricao: '',
    link_pdf: '',
    observacoes: '',
  })

  const supabase = createClient()

  async function loadData() {
    const [{ data: cli }, { data: cfg }] = await Promise.all([
      supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('configuracoes').select('valor').eq('chave', 'imposto_percentual').single(),
    ])
    setClientes(cli || [])
    if (cfg?.valor) {
      setAliquota(parseFloat(cfg.valor as any) || 6)
    }
  }

  async function loadVendasCliente(clienteId: string) {
    if (!clienteId) return
    const { data } = await supabase
      .from('vendas')
      .select('id, data_venda, valor_total, desconto')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false })
      .limit(20)
    setVendas(data || [])
  }

  useEffect(() => {
    if (open) loadData()
  }, [open])

  useEffect(() => {
    if (nf) {
      setFormData({
        cliente_id: nf.cliente_id || '',
        venda_id: nf.venda_id || '',
        numero: nf.numero || '',
        serie: nf.serie || '',
        data_emissao: nf.data_emissao || getTodayLocal(),
        valor: String(nf.valor || ''),
        valor_imposto: String(nf.valor_imposto || ''),
        status: nf.status || 'pendente',
        descricao: nf.descricao || '',
        link_pdf: nf.link_pdf || '',
        observacoes: nf.observacoes || '',
      })
      if (nf.cliente_id) loadVendasCliente(nf.cliente_id)
    } else {
      setFormData({
        cliente_id: '',
        venda_id: '',
        numero: '',
        serie: '',
        data_emissao: getTodayLocal(),
        valor: '',
        valor_imposto: '',
        status: 'pendente',
        descricao: '',
        link_pdf: '',
        observacoes: '',
      })
    }
  }, [nf, open])

  // Calcular imposto automaticamente
  useEffect(() => {
    if (formData.valor && aliquota && !nf) {
      const valor = parseFloat(formData.valor) || 0
      const imposto = (valor * aliquota) / 100
      setFormData(prev => ({ ...prev, valor_imposto: imposto.toFixed(2) }))
    }
  }, [formData.valor, aliquota])

  function selectVenda(vendaId: string) {
    const venda = vendas.find(v => v.id === vendaId)
    if (venda) {
      const valor = Number(venda.valor_total) - Number(venda.desconto || 0)
      setFormData(prev => ({
        ...prev,
        venda_id: vendaId,
        valor: String(valor),
      }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const data: any = {
        cliente_id: formData.cliente_id || null,
        venda_id: formData.venda_id || null,
        numero: formData.numero || null,
        serie: formData.serie || null,
        data_emissao: formData.data_emissao,
        valor: parseFloat(formData.valor) || 0,
        valor_imposto: parseFloat(formData.valor_imposto) || 0,
        status: formData.status,
        descricao: formData.descricao || null,
        link_pdf: formData.link_pdf || null,
        observacoes: formData.observacoes || null,
      }

      if (!nf) data.created_by = user?.id

      if (nf) {
        const { error } = await supabase.from('notas_fiscais').update(data).eq('id', nf.id)
        if (error) throw error
        toast.success('NF atualizada!')
      } else {
        const { error } = await supabase.from('notas_fiscais').insert(data)
        if (error) throw error
        toast.success('NF registrada!')
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
          <DialogTitle>{nf ? 'Editar' : 'Nova'} Nota Fiscal</DialogTitle>
          <DialogDescription>
            Registre uma nota fiscal emitida
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Autocomplete
                options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                value={formData.cliente_id}
                onChange={(v) => {
                  setFormData({ ...formData, cliente_id: v, venda_id: '' })
                  loadVendasCliente(v)
                }}
                placeholder="Selecione (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Emissão *</Label>
              <Input
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                required
              />
            </div>
          </div>

          {vendas.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a Venda (opcional)</Label>
              <Autocomplete
                options={vendas.map(v => ({
                  value: v.id,
                  label: `Venda ${new Date(v.data_venda).toLocaleDateString('pt-BR')}`,
                  description: formatCurrency(Number(v.valor_total) - Number(v.desconto || 0)),
                }))}
                value={formData.venda_id}
                onChange={selectVenda}
                placeholder="Sem vínculo"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Número da NF</Label>
              <Input
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="Ex: 000123"
              />
            </div>
            <div className="space-y-2">
              <Label>Série</Label>
              <Input
                value={formData.serie}
                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                placeholder="Ex: 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição do Serviço</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Produção de podcast - 3 episódios"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="space-y-2">
              <Label>Valor Total da NF (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                required
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label>Imposto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_imposto}
                onChange={(e) => setFormData({ ...formData, valor_imposto: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Calculado a {aliquota}% (configurado)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link do PDF (opcional)</Label>
            <Input
              type="url"
              value={formData.link_pdf}
              onChange={(e) => setFormData({ ...formData, link_pdf: e.target.value })}
              placeholder="https://..."
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
