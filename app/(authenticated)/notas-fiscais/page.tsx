'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, FileText, ExternalLink, Receipt, TrendingUp, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'
import { NfFormDialog } from './nf-form-dialog'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500' },
  emitida: { label: 'Emitida', color: 'bg-green-600' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500' },
}

export default function NotasFiscaisPage() {
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingNf, setEditingNf] = useState<any>(null)
  const [competencia, setCompetencia] = useState(new Date().toISOString().substring(0, 7))

  const supabase = createClient()

  async function loadNotas() {
    setLoading(true)
    const inicio = `${competencia}-01`
    const dataFim = new Date(competencia + '-01')
    dataFim.setMonth(dataFim.getMonth() + 1)
    const fim = dataFim.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('notas_fiscais')
      .select('*, clientes(nome), vendas(valor_total)')
      .gte('data_emissao', inicio)
      .lt('data_emissao', fim)
      .order('data_emissao', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar notas fiscais')
      console.error(error)
    } else {
      setNotas(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadNotas()
  }, [competencia])

  useRealtime('notas_fiscais', loadNotas)

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta nota fiscal? (Não cancela junto na SEFAZ)')) return
    const { error } = await supabase.from('notas_fiscais').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluída!'); loadNotas() }
  }

  // Cálculos
  const totalEmitido = notas
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + Number(n.valor), 0)

  const totalImposto = notas
    .filter(n => n.status === 'emitida')
    .reduce((sum, n) => sum + Number(n.valor_imposto || 0), 0)

  const pendentes = notas.filter(n => n.status === 'pendente').length

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Notas Fiscais
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de notas fiscais emitidas
          </p>
        </div>
        <div className="flex gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Mês</Label>
            <Input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={() => { setEditingNf(null); setOpenDialog(true) }} className="mt-5">
            <Plus className="h-4 w-4 mr-2" />
            Nova NF
          </Button>
        </div>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Emitido</CardDescription>
            <CardTitle className="text-2xl text-green-600">{formatCurrency(totalEmitido)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Imposto Pago</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{formatCurrency(totalImposto)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total NFs</CardDescription>
            <CardTitle className="text-2xl">{notas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendentes > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{pendentes}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Aviso sobre emissão */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold mb-1">💡 Sobre a emissão de NF:</p>
              <p className="text-muted-foreground">
                Este módulo registra as notas fiscais para controle e cálculo de imposto. A emissão real
                deve ser feita no portal da sua prefeitura (NFS-e) ou em serviços como{' '}
                <a href="https://www.enotas.com.br" target="_blank" className="text-blue-600 underline">eNotas</a>,{' '}
                <a href="https://www.plugnotas.com.br" target="_blank" className="text-blue-600 underline">PlugNotas</a> ou{' '}
                <a href="https://www.bling.com.br" target="_blank" className="text-blue-600 underline">Bling</a>.
                Após emitir, registre aqui para manter o controle financeiro.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : notas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Nenhuma nota fiscal neste mês. Clique em "Nova NF" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Imposto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell>{formatDate(nf.data_emissao)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {nf.numero || '-'}
                      {nf.serie && <span className="text-xs text-muted-foreground">/{nf.serie}</span>}
                    </TableCell>
                    <TableCell>{nf.clientes?.nome || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{nf.descricao || '-'}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(nf.valor)}</TableCell>
                    <TableCell className="font-mono text-purple-600">
                      {formatCurrency(nf.valor_imposto || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_LABEL[nf.status]?.color}>
                        {STATUS_LABEL[nf.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {nf.link_pdf && (
                          <a href={nf.link_pdf} target="_blank">
                            <Button variant="ghost" size="sm" title="Ver PDF">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar"
                          onClick={() => { setEditingNf(nf); setOpenDialog(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Excluir"
                          onClick={() => handleDelete(nf.id)}
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

      <NfFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        nf={editingNf}
        onSuccess={() => {
          setOpenDialog(false)
          loadNotas()
        }}
      />
    </div>
  )
}
