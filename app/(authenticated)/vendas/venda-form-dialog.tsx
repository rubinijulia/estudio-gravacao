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
import { Trash2, Plus } from 'lucide-react'
import { formatCurrency, getTodayLocal } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  venda?: any
  onSuccess: () => void
}

type Item = {
  servico_id?: string
  descricao: string
  quantidade: number
  valor_unitario: number
}

export function VendaFormDialog({ open, onOpenChange, venda, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [showNovoCliente, setShowNovoCliente] = useState(false)
  const [novoClienteNome, setNovoClienteNome] = useState('')

  const [formData, setFormData] = useState({
    cliente_id: '',
    data_venda: getTodayLocal(),
    desconto: '0',
    forma_pagamento: 'pix',
    parcelas: '1',
    status_pagamento: 'a_receber',
    valor_sinal: '',
    data_sinal: '',
    data_quitacao: '',
    observacoes: '',
    nf_emitida: false,
    nf_numero: '',
    nf_data_emissao: '',
    nf_link: '',
  })

  const [itens, setItens] = useState<Item[]>([])
  const [aliquotaImposto, setAliquotaImposto] = useState(0)

  const supabase = createClient()

  async function loadData() {
    const [{ data: cli }, { data: srv }, { data: cfgImp }] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('servicos').select('*').eq('ativo', true).order('nome'),
      supabase.from('configuracoes').select('valor').eq('chave', 'imposto_percentual').single(),
    ])
    setClientes(cli || [])
    setServicos(srv || [])
    if (cfgImp?.valor) {
      setAliquotaImposto(parseFloat(cfgImp.valor as any) || 0)
    }
  }

  useEffect(() => {
    if (open) loadData()
  }, [open])

  useEffect(() => {
    if (venda) {
      setFormData({
        cliente_id: venda.cliente_id || '',
        data_venda: venda.data_venda || getTodayLocal(),
        desconto: String(venda.desconto || '0'),
        forma_pagamento: venda.forma_pagamento || 'pix',
        parcelas: String(venda.parcelas || '1'),
        status_pagamento: venda.status_pagamento || 'a_receber',
        valor_sinal: String(venda.valor_sinal || ''),
        data_sinal: venda.data_sinal || '',
        data_quitacao: venda.data_quitacao || '',
        observacoes: venda.observacoes || '',
        nf_emitida: venda.nf_emitida ?? false,
        nf_numero: venda.nf_numero || '',
        nf_data_emissao: venda.nf_data_emissao || '',
        nf_link: venda.nf_link || '',
      })
      loadItens(venda.id)
    } else {
      setFormData({
        cliente_id: '',
        data_venda: getTodayLocal(),
        desconto: '0',
        forma_pagamento: 'pix',
        parcelas: '1',
        status_pagamento: 'a_receber',
        valor_sinal: '',
        data_sinal: '',
        data_quitacao: '',
        observacoes: '',
        nf_emitida: false,
        nf_numero: '',
        nf_data_emissao: '',
        nf_link: '',
      })
      setItens([])
    }
  }, [venda, open])

  async function loadItens(vendaId: string) {
    const { data } = await supabase
      .from('vendas_itens')
      .select('*')
      .eq('venda_id', vendaId)
    setItens(data?.map(i => ({
      servico_id: i.servico_id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      valor_unitario: Number(i.valor_unitario),
    })) || [])
  }

  function addItem() {
    setItens([...itens, { descricao: '', quantidade: 1, valor_unitario: 0 }])
  }

  function removeItem(index: number) {
    setItens(itens.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof Item, value: any) {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }
    setItens(newItens)
  }

  function selectServico(index: number, servicoId: string) {
    const servico = servicos.find(s => s.id === servicoId)
    if (servico) {
      const newItens = [...itens]
      newItens[index] = {
        ...newItens[index],
        servico_id: servicoId,
        descricao: servico.nome,
        valor_unitario: Number(servico.valor_padrao),
      }
      setItens(newItens)
    }
  }

  async function criarNovoCliente() {
    if (!novoClienteNome.trim()) return

    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome: novoClienteNome, cadastro_completo: false })
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar cliente')
      return
    }

    setClientes([...clientes, data])
    setFormData({ ...formData, cliente_id: data.id })
    setNovoClienteNome('')
    setShowNovoCliente(false)
    toast.success('Cliente criado! Complete o cadastro depois.')
  }

  const valorTotal = itens.reduce((sum, i) => sum + (i.quantidade * i.valor_unitario), 0)
  const valorFinal = valorTotal - parseFloat(formData.desconto || '0')
  const valorImposto = aliquotaImposto > 0 ? (valorFinal * aliquotaImposto) / 100 : 0
  const lucroLiquido = valorFinal - valorImposto

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const vendaData: any = {
        cliente_id: formData.cliente_id,
        data_venda: formData.data_venda,
        valor_total: valorTotal,
        desconto: parseFloat(formData.desconto || '0'),
        forma_pagamento: formData.forma_pagamento,
        parcelas: parseInt(formData.parcelas) || 1,
        status_pagamento: formData.status_pagamento,
        valor_sinal: formData.valor_sinal ? parseFloat(formData.valor_sinal) : null,
        data_sinal: formData.data_sinal || null,
        data_quitacao: formData.data_quitacao || null,
        observacoes: formData.observacoes || null,
        valor_imposto: valorImposto,
        nf_emitida: formData.nf_emitida,
        nf_numero: formData.nf_numero || null,
        nf_data_emissao: formData.nf_data_emissao || null,
        nf_link: formData.nf_link || null,
      }

      if (!venda) {
        vendaData.created_by = user?.id
      }

      let vendaId = venda?.id

      if (venda) {
        const { error } = await supabase
          .from('vendas')
          .update(vendaData)
          .eq('id', venda.id)
        if (error) throw error

        // Remover itens antigos
        await supabase.from('vendas_itens').delete().eq('venda_id', venda.id)
      } else {
        const { data, error } = await supabase
          .from('vendas')
          .insert(vendaData)
          .select()
          .single()
        if (error) throw error
        vendaId = data.id
      }

      // Inserir itens
      const itensData = itens.map(i => ({
        venda_id: vendaId,
        servico_id: i.servico_id || null,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.quantidade * i.valor_unitario,
      }))

      const { error: itensError } = await supabase
        .from('vendas_itens')
        .insert(itensData)

      if (itensError) throw itensError

      toast.success(venda ? 'Venda atualizada!' : 'Venda cadastrada!')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar venda')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venda ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
          <DialogDescription>
            Preencha os dados da venda
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            {!showNovoCliente ? (
              <div className="flex gap-2">
                <Autocomplete
                  className="flex-1"
                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                  value={formData.cliente_id}
                  onChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  placeholder="Buscar cliente..."
                  emptyMessage="Nenhum cliente encontrado"
                />
                <Button type="button" variant="outline" onClick={() => setShowNovoCliente(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do novo cliente"
                  value={novoClienteNome}
                  onChange={(e) => setNovoClienteNome(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" onClick={criarNovoCliente}>Criar</Button>
                <Button type="button" variant="outline" onClick={() => setShowNovoCliente(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Itens *</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>

            {itens.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
                Nenhum item adicionado. Clique em "Adicionar" para incluir um serviço.
              </div>
            ) : (
              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                    {/* Botão remover no canto */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Serviço</Label>
                        <Autocomplete
                          options={servicos.map(s => ({
                            value: s.id,
                            label: s.nome,
                            description: `R$ ${Number(s.valor_padrao).toFixed(2)}`
                          }))}
                          value={item.servico_id || ''}
                          onChange={(v) => selectServico(index, v)}
                          placeholder="Buscar serviço..."
                        />
                      </div>
                      <div className="space-y-1 pr-10">
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          value={item.descricao}
                          onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                          placeholder="Descrição"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor Unitário (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.valor_unitario}
                          onChange={(e) => updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="text-right">
                        <Label className="text-xs">Total</Label>
                        <div className="h-9 flex items-center justify-end font-mono font-semibold text-base">
                          {formatCurrency(item.quantidade * item.valor_unitario)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo de valores */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Subtotal</div>
                <div className="text-lg font-semibold">{formatCurrency(valorTotal)}</div>
              </div>
              <div>
                <Label className="text-xs">Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.desconto}
                  onChange={(e) => setFormData({ ...formData, desconto: e.target.value })}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-lg font-bold text-primary">{formatCurrency(valorFinal)}</div>
              </div>
            </div>

            {aliquotaImposto > 0 && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Imposto ({aliquotaImposto}%)
                  </div>
                  <div className="text-base font-semibold text-purple-600">
                    {formatCurrency(valorImposto)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Líquido (após imposto)</div>
                  <div className="text-base font-bold text-green-700">
                    {formatCurrency(lucroLiquido)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Nota Fiscal */}
          <div className="space-y-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">📄 Nota Fiscal</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.nf_emitida}
                  onChange={(e) => setFormData({
                    ...formData,
                    nf_emitida: e.target.checked,
                    nf_data_emissao: e.target.checked && !formData.nf_data_emissao ? getTodayLocal() : formData.nf_data_emissao,
                  })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">
                  {formData.nf_emitida ? '✅ NF Emitida' : '⏳ NF Pendente'}
                </span>
              </label>
            </div>

            {formData.nf_emitida && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Número da NF</Label>
                  <Input
                    value={formData.nf_numero}
                    onChange={(e) => setFormData({ ...formData, nf_numero: e.target.value })}
                    placeholder="Ex: 000123"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data de emissão</Label>
                  <Input
                    type="date"
                    value={formData.nf_data_emissao}
                    onChange={(e) => setFormData({ ...formData, nf_data_emissao: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Link do PDF</Label>
                  <Input
                    type="url"
                    value={formData.nf_link}
                    onChange={(e) => setFormData({ ...formData, nf_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data da Venda</Label>
              <Input
                type="date"
                value={formData.data_venda}
                onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
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
            <div className="space-y-2">
              <Label>Status Pagamento</Label>
              <Select
                value={formData.status_pagamento}
                onValueChange={(v) => setFormData({ ...formData, status_pagamento: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_receber">A Receber</SelectItem>
                  <SelectItem value="sinal_pago">Sinal Pago</SelectItem>
                  <SelectItem value="totalmente_recebido">Totalmente Recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.status_pagamento === 'sinal_pago' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor do Sinal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_sinal}
                  onChange={(e) => setFormData({ ...formData, valor_sinal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data do Sinal</Label>
                <Input
                  type="date"
                  value={formData.data_sinal}
                  onChange={(e) => setFormData({ ...formData, data_sinal: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.status_pagamento === 'totalmente_recebido' && (
            <div className="space-y-2">
              <Label>Data da Quitação</Label>
              <Input
                type="date"
                value={formData.data_quitacao}
                onChange={(e) => setFormData({ ...formData, data_quitacao: e.target.value })}
              />
            </div>
          )}

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
              {loading ? 'Salvando...' : 'Salvar Venda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
