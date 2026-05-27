'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, TrendingUp, TrendingDown, Plus, Edit, Trash2, Calendar, FileDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate, dateToLocalString } from '@/lib/formatters'
import { CustoFixoFormDialog } from './custo-fixo-form-dialog'
import { CustoVariavelFormDialog } from './custo-variavel-form-dialog'
import { RecebimentoFormDialog } from './recebimento-form-dialog'
import { exportarPDF, exportarCSV } from '@/lib/export-relatorio'

const CATEGORIA_LABEL: Record<string, string> = {
  aluguel: 'Aluguel',
  pro_labore: 'Pró-labore',
  software: 'Software',
  marketing: 'Marketing',
  contabilidade: 'Contabilidade',
  outros: 'Outros',
}

export default function FinanceiroPage() {
  const searchParams = useSearchParams()
  const mesParam = searchParams.get('mes')
  const [loading, setLoading] = useState(true)
  const [competencia, setCompetencia] = useState(mesParam || new Date().toISOString().substring(0, 7))
  const [recebimentos, setRecebimentos] = useState<any[]>([])
  const [custosFixos, setCustosFixos] = useState<any[]>([])
  const [custosVariaveis, setCustosVariaveis] = useState<any[]>([])
  const [vendasMes, setVendasMes] = useState<any[]>([])
  const [resumo, setResumo] = useState({
    vendido: 0,
    receitas: 0,
    despesasFixas: 0,
    despesasVariaveis: 0,
    lucro: 0,
  })

  const [openCustoFixo, setOpenCustoFixo] = useState(false)
  const [openCustoVariavel, setOpenCustoVariavel] = useState(false)
  const [openRecebimento, setOpenRecebimento] = useState(false)
  const [editingCustoFixo, setEditingCustoFixo] = useState<any>(null)
  const [editingCustoVariavel, setEditingCustoVariavel] = useState<any>(null)

  const supabase = createClient()

  async function loadData() {
    setLoading(true)
    const inicio = `${competencia}-01`
    const dataFim = new Date(competencia + '-01')
    dataFim.setMonth(dataFim.getMonth() + 1)
    const fim = dateToLocalString(dataFim)

    const [rec, cf, cv, vds] = await Promise.all([
      supabase
        .from('recebimentos')
        .select('*, vendas(clientes(nome))')
        .gte('data_recebimento', inicio)
        .lt('data_recebimento', fim)
        .order('data_recebimento', { ascending: false }),
      supabase.from('custos_fixos').select('*').order('valor', { ascending: false }),
      supabase
        .from('custos_variaveis')
        .select('*, users_profile(nome)')
        .eq('competencia', inicio)
        .order('valor_total', { ascending: false }),
      supabase
        .from('vendas')
        .select('*, clientes(nome)')
        .gte('data_venda', inicio)
        .lt('data_venda', fim)
        .neq('status_pagamento', 'cancelado'),
    ])

    setRecebimentos(rec.data || [])
    setCustosFixos(cf.data || [])
    setCustosVariaveis(cv.data || [])
    setVendasMes(vds.data || [])

    const vendido = (vds.data || []).reduce(
      (sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)),
      0
    )
    const receitas = (rec.data || []).reduce((sum, r) => sum + Number(r.valor), 0)
    const despesasFixas = (cf.data || []).filter(c => c.ativo).reduce((sum, c) => sum + Number(c.valor), 0)
    const despesasVariaveis = (cv.data || []).reduce((sum, c) => sum + Number(c.valor_total), 0)

    setResumo({
      vendido,
      receitas,
      despesasFixas,
      despesasVariaveis,
      lucro: receitas - despesasFixas - despesasVariaveis,
    })
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [competencia])

  async function deleteCustoFixo(id: string) {
    if (!confirm('Excluir este custo fixo?')) return
    const { error } = await supabase.from('custos_fixos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluído!'); loadData() }
  }

  async function deleteCustoVariavel(id: string) {
    if (!confirm('Excluir este custo variável?')) return
    const { error } = await supabase.from('custos_variaveis').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluído!'); loadData() }
  }

  async function deleteRecebimento(id: string) {
    if (!confirm('Excluir este recebimento?')) return
    const { error } = await supabase.from('recebimentos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluído!'); loadData() }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de receitas e despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Competência:</Label>
          <Input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendido</CardDescription>
            <CardTitle className="text-xl">{formatCurrency(resumo.vendido)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription>Recebido</CardDescription>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <CardTitle className="text-xl text-green-600">{formatCurrency(resumo.receitas)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription>Custos Fixos</CardDescription>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">{formatCurrency(resumo.despesasFixas)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription>Custos Variáveis</CardDescription>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
            <CardTitle className="text-xl text-orange-600">{formatCurrency(resumo.despesasVariaveis)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={resumo.lucro >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-300 bg-red-50'}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardDescription>Lucro Real</CardDescription>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className={`text-xl ${resumo.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(resumo.lucro)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="entradas">
        <TabsList>
          <TabsTrigger value="entradas">Entradas</TabsTrigger>
          <TabsTrigger value="custos-fixos">Custos Fixos</TabsTrigger>
          <TabsTrigger value="custos-variaveis">Custos Variáveis</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento Mensal</TabsTrigger>
        </TabsList>

        {/* ENTRADAS */}
        <TabsContent value="entradas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recebimentos</CardTitle>
                <CardDescription>Entradas financeiras do mês</CardDescription>
              </div>
              <Button onClick={() => setOpenRecebimento(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Recebimento
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recebimentos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum recebimento registrado neste mês.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recebimentos.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.data_recebimento)}</TableCell>
                        <TableCell>{r.vendas?.clientes?.nome || '-'}</TableCell>
                        <TableCell><Badge variant="secondary">{r.tipo}</Badge></TableCell>
                        <TableCell>{r.forma_pagamento || '-'}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {formatCurrency(r.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => deleteRecebimento(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUSTOS FIXOS */}
        <TabsContent value="custos-fixos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Custos Fixos</CardTitle>
                <CardDescription>Despesas recorrentes mensais</CardDescription>
              </div>
              <Button onClick={() => { setEditingCustoFixo(null); setOpenCustoFixo(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Custo Fixo
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {custosFixos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum custo fixo cadastrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custosFixos.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.nome}
                          {c.observacoes && (
                            <div className="text-xs text-muted-foreground">{c.observacoes}</div>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{CATEGORIA_LABEL[c.categoria]}</Badge></TableCell>
                        <TableCell>{c.dia_vencimento ? `Dia ${c.dia_vencimento}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={c.ativo ? 'default' : 'secondary'}>
                            {c.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {formatCurrency(c.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCustoFixo(c); setOpenCustoFixo(true) }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCustoFixo(c.id)}>
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
        </TabsContent>

        {/* CUSTOS VARIÁVEIS */}
        <TabsContent value="custos-variaveis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Custos Variáveis</CardTitle>
                <CardDescription>Horas de colaborador, freelas pontuais do mês</CardDescription>
              </div>
              <Button onClick={() => { setEditingCustoVariavel(null); setOpenCustoVariavel(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Custo Variável
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {custosVariaveis.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum custo variável cadastrado neste mês.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Valor/h</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custosVariaveis.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.descricao}</TableCell>
                        <TableCell>{c.users_profile?.nome || '-'}</TableCell>
                        <TableCell>{c.horas_trabalhadas || '-'}</TableCell>
                        <TableCell>{c.valor_hora ? formatCurrency(c.valor_hora) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">
                          {formatCurrency(c.valor_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingCustoVariavel(c); setOpenCustoVariavel(true) }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCustoVariavel(c.id)}>
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
        </TabsContent>

        {/* FECHAMENTO MENSAL */}
        <TabsContent value="fechamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechamento Mensal - {new Date(competencia + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription>Relatório consolidado do mês</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Receitas */}
              <div>
                <h3 className="font-semibold mb-3 text-green-700 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Receitas
                </h3>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between p-2 border-l-2 border-green-500 bg-green-50">
                    <span>Vendido no mês</span>
                    <span className="font-mono">{formatCurrency(resumo.vendido)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-l-2 border-green-500 bg-green-50">
                    <span>Recebido no mês</span>
                    <span className="font-mono font-bold">{formatCurrency(resumo.receitas)}</span>
                  </div>
                </div>
              </div>

              {/* Despesas */}
              <div>
                <h3 className="font-semibold mb-3 text-red-700 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Despesas
                </h3>
                <div className="space-y-2 pl-6">
                  <div className="flex justify-between p-2 border-l-2 border-red-500 bg-red-50">
                    <span>Custos fixos ativos</span>
                    <span className="font-mono">{formatCurrency(resumo.despesasFixas)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-l-2 border-orange-500 bg-orange-50">
                    <span>Custos variáveis</span>
                    <span className="font-mono">{formatCurrency(resumo.despesasVariaveis)}</span>
                  </div>
                  <div className="flex justify-between p-2 border-l-2 border-red-700 bg-red-100 font-semibold">
                    <span>Total despesas</span>
                    <span className="font-mono">{formatCurrency(resumo.despesasFixas + resumo.despesasVariaveis)}</span>
                  </div>
                </div>
              </div>

              {/* Lucro */}
              <div className={`p-4 rounded-lg ${resumo.lucro >= 0 ? 'bg-blue-50 border border-blue-200' : 'bg-red-100 border border-red-300'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`font-bold text-lg ${resumo.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      Lucro Real do Mês
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Recebido - Custos Fixos - Custos Variáveis
                    </p>
                  </div>
                  <div className={`text-3xl font-bold ${resumo.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatCurrency(resumo.lucro)}
                  </div>
                </div>
              </div>

              {/* Botões de exportação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    exportarCSV({
                      competencia,
                      vendido: resumo.vendido,
                      recebido: resumo.receitas,
                      despesasFixas: resumo.despesasFixas,
                      despesasVariaveis: resumo.despesasVariaveis,
                      lucro: resumo.lucro,
                      vendas: vendasMes,
                      recebimentos,
                      custosFixos,
                      custosVariaveis,
                    })
                    toast.success('CSV gerado!')
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button
                  onClick={() => {
                    exportarPDF({
                      competencia,
                      vendido: resumo.vendido,
                      recebido: resumo.receitas,
                      despesasFixas: resumo.despesasFixas,
                      despesasVariaveis: resumo.despesasVariaveis,
                      lucro: resumo.lucro,
                      vendas: vendasMes,
                      recebimentos,
                      custosFixos,
                      custosVariaveis,
                    })
                    toast.success('PDF gerado!')
                  }}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustoFixoFormDialog
        open={openCustoFixo}
        onOpenChange={setOpenCustoFixo}
        custo={editingCustoFixo}
        onSuccess={() => { setOpenCustoFixo(false); loadData() }}
      />

      <CustoVariavelFormDialog
        open={openCustoVariavel}
        onOpenChange={setOpenCustoVariavel}
        custo={editingCustoVariavel}
        onSuccess={() => { setOpenCustoVariavel(false); loadData() }}
      />

      <RecebimentoFormDialog
        open={openRecebimento}
        onOpenChange={setOpenRecebimento}
        onSuccess={() => { setOpenRecebimento(false); loadData() }}
      />
    </div>
  )
}
