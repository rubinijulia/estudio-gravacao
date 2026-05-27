'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, FileText, FileCheck } from 'lucide-react'
import { toast } from 'sonner'
import { VendaFormDialog } from './venda-form-dialog'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'

const STATUS_PAGAMENTO_LABEL: Record<string, { label: string; variant: any }> = {
  a_receber: { label: 'A Receber', variant: 'destructive' },
  sinal_pago: { label: 'Sinal Pago', variant: 'default' },
  totalmente_recebido: { label: 'Pago', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'secondary' },
}

const STATUS_SERVICO_LABEL: Record<string, { label: string; variant: any }> = {
  em_curso: { label: 'Em Curso', variant: 'secondary' },
  realizada: { label: 'Realizada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
}

export default function VendasPage() {
  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingVenda, setEditingVenda] = useState<any>(null)
  const [resumo, setResumo] = useState({
    vendido: 0,
    recebido: 0,
    aReceber: 0,
    cancelado: 0,
  })

  const supabase = createClient()

  async function loadVendas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('vendas')
      .select('*, clientes(nome)')
      .order('data_venda', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar vendas')
      console.error(error)
    } else {
      setVendas(data || [])
      calcularResumo(data || [])
    }
    setLoading(false)
  }

  function calcularResumo(vendas: any[]) {
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const vendasMes = vendas.filter(v => new Date(v.data_venda) >= inicioMes)

    const vendido = vendasMes
      .filter(v => v.status_pagamento !== 'cancelado')
      .reduce((sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)), 0)

    const recebido = vendasMes
      .filter(v => v.status_pagamento === 'totalmente_recebido')
      .reduce((sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)), 0)
      + vendasMes
        .filter(v => v.status_pagamento === 'sinal_pago')
        .reduce((sum, v) => sum + Number(v.valor_sinal || 0), 0)

    const aReceber = vendasMes
      .filter(v => v.status_pagamento === 'a_receber' || v.status_pagamento === 'sinal_pago')
      .reduce((sum, v) => {
        const total = Number(v.valor_total) - Number(v.desconto || 0)
        const sinal = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
        return sum + (total - sinal)
      }, 0)

    const cancelado = vendasMes
      .filter(v => v.status_pagamento === 'cancelado')
      .reduce((sum, v) => sum + Number(v.valor_total), 0)

    setResumo({ vendido, recebido, aReceber, cancelado })
  }

  useEffect(() => {
    loadVendas()
  }, [])

  // 🔴 Realtime: lista atualiza quando alguém cria/edita venda
  useRealtime('vendas', loadVendas)

  async function handleCheckNf(venda: any) {
    if (venda.nf_emitida) {
      if (!confirm('Desmarcar NF como emitida?')) return
    }

    const { error } = await supabase
      .from('vendas')
      .update({
        nf_emitida: !venda.nf_emitida,
        nf_data_emissao: !venda.nf_emitida ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', venda.id)

    if (error) {
      toast.error('Erro ao atualizar')
    } else {
      toast.success(venda.nf_emitida ? 'NF desmarcada' : 'NF marcada como emitida!')
      loadVendas()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir esta venda?')) return
    const { error } = await supabase.from('vendas').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir venda')
    } else {
      toast.success('Venda excluída!')
      loadVendas()
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground mt-1">Gestão de vendas e pagamentos</p>
        </div>
        <Button onClick={() => { setEditingVenda(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Venda
        </Button>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendido (mês)</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(resumo.vendido)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recebido (mês)</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(resumo.recebido)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Receber</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{formatCurrency(resumo.aReceber)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cancelado (mês)</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{formatCurrency(resumo.cancelado)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : vendas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma venda cadastrada. Clique em "Nova Venda" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Imposto</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDate(venda.data_venda)}</TableCell>
                    <TableCell className="font-medium">{venda.clientes?.nome || 'Cliente removido'}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(Number(venda.valor_total) - Number(venda.desconto || 0))}
                    </TableCell>
                    <TableCell className="font-mono text-purple-600 text-sm">
                      {Number(venda.valor_imposto || 0) > 0
                        ? formatCurrency(venda.valor_imposto)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {venda.nf_emitida ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                          onClick={() => handleCheckNf(venda)}
                          title="Clique pra desmarcar"
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Emitida
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 bg-green-600 hover:bg-green-700"
                          onClick={() => handleCheckNf(venda)}
                          title="Marcar NF como emitida"
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Emitir
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_PAGAMENTO_LABEL[venda.status_pagamento]?.variant}>
                        {STATUS_PAGAMENTO_LABEL[venda.status_pagamento]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_SERVICO_LABEL[venda.status_servico]?.variant}>
                        {STATUS_SERVICO_LABEL[venda.status_servico]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingVenda(venda); setOpenDialog(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(venda.id)}
                        >
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

      <VendaFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        venda={editingVenda}
        onSuccess={() => {
          setOpenDialog(false)
          loadVendas()
        }}
      />
    </div>
  )
}
