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
import { Edit, FileText, FileCheck, ExternalLink, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'
import Link from 'next/link'

type Filtro = 'todas' | 'emitidas' | 'pendentes'

export default function NotasFiscaisPage() {
  const [vendas, setVendas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [competencia, setCompetencia] = useState(new Date().toISOString().substring(0, 7))
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const supabase = createClient()

  async function loadVendas() {
    setLoading(true)
    const inicio = `${competencia}-01`
    const dataFim = new Date(competencia + '-01')
    dataFim.setMonth(dataFim.getMonth() + 1)
    const fim = dataFim.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('vendas')
      .select('*, clientes(nome)')
      .gte('data_venda', inicio)
      .lt('data_venda', fim)
      .neq('status_pagamento', 'cancelado')
      .order('data_venda', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar')
      console.error(error)
    } else {
      setVendas(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadVendas()
  }, [competencia])

  useRealtime('vendas', loadVendas)

  async function marcarComoEmitida(venda: any) {
    if (!confirm(`Marcar NF da venda como EMITIDA?`)) return

    const { error } = await supabase
      .from('vendas')
      .update({
        nf_emitida: true,
        nf_data_emissao: new Date().toISOString().split('T')[0],
      })
      .eq('id', venda.id)

    if (error) {
      toast.error('Erro ao atualizar')
    } else {
      toast.success('Marcada como emitida!')
      loadVendas()
    }
  }

  const vendasFiltradas = vendas.filter(v => {
    if (filtro === 'emitidas') return v.nf_emitida
    if (filtro === 'pendentes') return !v.nf_emitida
    return true
  })

  // Métricas
  const totalVendas = vendas.length
  const totalEmitidas = vendas.filter(v => v.nf_emitida).length
  const totalPendentes = totalVendas - totalEmitidas
  const valorTotal = vendas.reduce(
    (sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)),
    0
  )
  const impostoTotal = vendas.reduce((sum, v) => sum + Number(v.valor_imposto || 0), 0)
  const impostoEmitido = vendas
    .filter(v => v.nf_emitida)
    .reduce((sum, v) => sum + Number(v.valor_imposto || 0), 0)

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Notas Fiscais
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle de emissão de NFs a partir das vendas do mês
          </p>
        </div>
        <div>
          <Label className="text-xs">Mês</Label>
          <Input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Vendas</CardDescription>
            <CardTitle className="text-2xl">{totalVendas}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>NFs Emitidas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{totalEmitidas}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={totalPendentes > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>NFs Pendentes</CardDescription>
            <CardTitle className="text-2xl text-yellow-700">{totalPendentes}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardDescription>Imposto Total</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{formatCurrency(impostoTotal)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Emitido: {formatCurrency(impostoEmitido)}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filtro === 'todas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('todas')}
        >
          Todas ({totalVendas})
        </Button>
        <Button
          variant={filtro === 'pendentes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('pendentes')}
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          Pendentes ({totalPendentes})
        </Button>
        <Button
          variant={filtro === 'emitidas' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('emitidas')}
        >
          <FileCheck className="h-3 w-3 mr-1" />
          Emitidas ({totalEmitidas})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              Nenhuma venda neste mês.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Imposto</TableHead>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>{formatDate(venda.data_venda)}</TableCell>
                    <TableCell className="font-medium">{venda.clientes?.nome || '-'}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(Number(venda.valor_total) - Number(venda.desconto || 0))}
                    </TableCell>
                    <TableCell className="font-mono text-purple-600">
                      {Number(venda.valor_imposto || 0) > 0 ? formatCurrency(venda.valor_imposto) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{venda.nf_numero || '-'}</TableCell>
                    <TableCell>
                      {venda.nf_emitida ? (
                        <div>
                          <Badge className="bg-green-600">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Emitida
                          </Badge>
                          {venda.nf_data_emissao && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(venda.nf_data_emissao)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!venda.nf_emitida && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => marcarComoEmitida(venda)}
                            title="Marcar como emitida"
                          >
                            <FileCheck className="h-4 w-4 mr-1" />
                            Emitir
                          </Button>
                        )}
                        {venda.nf_link && (
                          <a href={venda.nf_link} target="_blank">
                            <Button variant="ghost" size="sm" title="Ver PDF">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Link href="/vendas">
                          <Button variant="ghost" size="sm" title="Editar venda">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm">
            <p className="font-semibold mb-1">💡 Como funciona:</p>
            <ul className="text-muted-foreground space-y-1 list-disc list-inside">
              <li>Toda venda calcula o imposto automaticamente pela alíquota configurada</li>
              <li>Após emitir a NF (no portal da Prefeitura ou eNotas/PlugNotas), clique em "Emitir"</li>
              <li>Para adicionar número da NF e link do PDF, edite a venda</li>
              <li>Configure a alíquota em <Link href="/configuracoes/parametros" className="underline">Configurações → Parâmetros</Link></li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
