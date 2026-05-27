'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  AtSign,
  FileText,
  DollarSign,
  Calendar,
  Film,
  ShoppingCart,
  Edit,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { isCadastroCompleto, camposFaltando } from '@/lib/cliente'
import { toast } from 'sonner'
import { useUser } from '@/lib/use-user'
import Link from 'next/link'
import { ClienteFormDialog } from '../cliente-form-dialog'

const STATUS_PAGAMENTO_LABEL: Record<string, { label: string; variant: any }> = {
  a_receber: { label: 'A Receber', variant: 'destructive' },
  sinal_pago: { label: 'Sinal Pago', variant: 'default' },
  totalmente_recebido: { label: 'Pago', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'secondary' },
}

const PROJETO_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  gravado: { label: 'Gravado', color: 'bg-slate-500' },
  editando: { label: 'Editando', color: 'bg-blue-500' },
  cortes: { label: 'Cortes', color: 'bg-purple-500' },
  enviado: { label: 'Enviado', color: 'bg-yellow-500' },
  em_ajuste: { label: 'Em Ajuste', color: 'bg-orange-500' },
  finalizado: { label: 'Finalizado', color: 'bg-green-600' },
}

export default function ClienteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const id = params.id as string

  const [cliente, setCliente] = useState<any>(null)
  const [vendas, setVendas] = useState<any[]>([])
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openEdit, setOpenEdit] = useState(false)

  const supabase = createClient()
  const podeVerFinanceiro = user?.role === 'admin' || user?.role === 'editor'

  async function loadData() {
    setLoading(true)

    try {
      const [{ data: cli }, { data: vds }, { data: ags }, { data: prjs }] = await Promise.all([
        supabase.from('clientes').select('*').eq('id', id).single(),
        supabase.from('vendas').select('*, vendas_itens(*)').eq('cliente_id', id).order('data_venda', { ascending: false }),
        supabase.from('agendamentos').select('*').eq('cliente_id', id).order('data', { ascending: false }),
        supabase.from('projetos').select('*, users_profile!projetos_responsavel_id_fkey(nome)').eq('cliente_id', id).order('created_at', { ascending: false }),
      ])

      if (!cli) {
        toast.error('Cliente não encontrado')
        router.push('/clientes')
        return
      }

      setCliente(cli)
      setVendas(vds || [])
      setAgendamentos(ags || [])
      setProjetos(prjs || [])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  if (!cliente) {
    return <div className="p-8">Cliente não encontrado</div>
  }

  // Cálculos
  const totalVendas = vendas.length
  const totalGasto = vendas
    .filter(v => v.status_pagamento !== 'cancelado')
    .reduce((sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)), 0)
  const totalRecebido = vendas
    .filter(v => v.status_pagamento === 'totalmente_recebido')
    .reduce((sum, v) => sum + (Number(v.valor_total) - Number(v.desconto || 0)), 0)
    + vendas
      .filter(v => v.status_pagamento === 'sinal_pago')
      .reduce((sum, v) => sum + Number(v.valor_sinal || 0), 0)
  const totalAReceber = totalGasto - totalRecebido
  const totalGravacoes = agendamentos.filter(a => a.gravacao_realizada).length
  const projetosAndamento = projetos.filter(p => p.status !== 'finalizado').length

  const completo = isCadastroCompleto(cliente)
  const faltam = camposFaltando(cliente)

  const ultimaCompra = vendas[0]?.data_venda

  return (
    <div className="p-8">
      {/* Voltar */}
      <Link href="/clientes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" />
        Voltar para Clientes
      </Link>

      {/* Cabeçalho */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">{cliente.nome}</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            ID: {cliente.id}
          </p>
          {!completo && (
            <div className="mt-2">
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Cadastro incompleto: {faltam.join(', ')}
              </Badge>
            </div>
          )}
        </div>
        <Button onClick={() => setOpenEdit(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Vendas</CardDescription>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">{totalVendas}</CardTitle>
          </CardHeader>
        </Card>

        {podeVerFinanceiro && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Gasto</CardDescription>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-blue-600">
                  {formatCurrency(totalGasto)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Recebido</CardDescription>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">
                  {formatCurrency(totalRecebido)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className={totalAReceber > 0 ? 'border-orange-200' : ''}>
              <CardHeader className="pb-2">
                <CardDescription>A Receber</CardDescription>
                <CardTitle className={`text-2xl ${totalAReceber > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {formatCurrency(totalAReceber)}
                </CardTitle>
              </CardHeader>
            </Card>
          </>
        )}
      </div>

      {/* Cards secundários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Gravações Realizadas</CardDescription>
              <Film className="h-4 w-4 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">{totalGravacoes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Projetos em Andamento</CardDescription>
              <Film className="h-4 w-4 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">{projetosAndamento}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Última Compra</CardDescription>
            <CardTitle className="text-lg">
              {ultimaCompra ? formatDate(ultimaCompra) : 'Nunca'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs com informações detalhadas */}
      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados de Contato</TabsTrigger>
          {podeVerFinanceiro && <TabsTrigger value="vendas">Vendas ({vendas.length})</TabsTrigger>}
          <TabsTrigger value="agendamentos">Gravações ({agendamentos.length})</TabsTrigger>
          <TabsTrigger value="projetos">Projetos ({projetos.length})</TabsTrigger>
        </TabsList>

        {/* DADOS */}
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato e Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{cliente.email || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Telefone</div>
                    <div className="font-medium">{cliente.telefone || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">CPF/CNPJ</div>
                    <div className="font-medium">{cliente.documento || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <AtSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Instagram</div>
                    <div className="font-medium">{cliente.instagram || '-'}</div>
                  </div>
                </div>
              </div>

              {(cliente.cep || cliente.endereco || cliente.cidade) && (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cliente.endereco}
                    {cliente.numero && `, ${cliente.numero}`}
                    {cliente.complemento && ` - ${cliente.complemento}`}
                    {cliente.bairro && <><br />Bairro: {cliente.bairro}</>}
                    {cliente.cidade && <><br />{cliente.cidade}{cliente.estado && `/${cliente.estado}`}</>}
                    {cliente.cep && <><br />CEP: {cliente.cep}</>}
                  </div>
                </div>
              )}

              {cliente.observacoes && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-semibold mb-2">Observações</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {cliente.observacoes}
                  </div>
                </div>
              )}

              {cliente.tags && cliente.tags.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <div className="text-sm font-semibold mb-2">Tags</div>
                  <div className="flex gap-2 flex-wrap">
                    {cliente.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDAS */}
        {podeVerFinanceiro && (
          <TabsContent value="vendas">
            <Card>
              <CardContent className="p-0">
                {vendas.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhuma venda registrada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendas.map(v => (
                        <TableRow key={v.id}>
                          <TableCell>{formatDate(v.data_venda)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {v.vendas_itens?.length || 0} ite{(v.vendas_itens?.length || 0) === 1 ? 'm' : 'ns'}
                            </div>
                            {v.vendas_itens?.slice(0, 2).map((i: any) => (
                              <div key={i.id} className="text-xs text-muted-foreground">
                                • {i.descricao}
                              </div>
                            ))}
                            {(v.vendas_itens?.length || 0) > 2 && (
                              <div className="text-xs text-muted-foreground">
                                + {v.vendas_itens.length - 2} mais...
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_PAGAMENTO_LABEL[v.status_pagamento]?.variant}>
                              {STATUS_PAGAMENTO_LABEL[v.status_pagamento]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(Number(v.valor_total) - Number(v.desconto || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* AGENDAMENTOS */}
        <TabsContent value="agendamentos">
          <Card>
            <CardContent className="p-0">
              {agendamentos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum agendamento registrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Estúdio</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendamentos.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{formatDate(a.data)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {a.hora_inicio?.substring(0, 5)} - {a.hora_fim?.substring(0, 5)}
                        </TableCell>
                        <TableCell className="font-medium">{a.titulo}</TableCell>
                        <TableCell>{a.estudio || '-'}</TableCell>
                        <TableCell>
                          {a.gravacao_realizada ? (
                            <Badge className="bg-green-600">✓ Gravado</Badge>
                          ) : (
                            <Badge variant="secondary">Agendado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJETOS */}
        <TabsContent value="projetos">
          <Card>
            <CardContent className="p-0">
              {projetos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum projeto criado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Entrega Prevista</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projetos.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.titulo}</TableCell>
                        <TableCell>{p.formato}</TableCell>
                        <TableCell>{p.users_profile?.nome || '-'}</TableCell>
                        <TableCell>
                          {formatDate(p.data_entrega_prevista)}
                          {p.data_entrega_real && (
                            <div className="text-xs text-muted-foreground">
                              Entregue: {formatDate(p.data_entrega_real)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={PROJETO_STATUS_LABEL[p.status]?.color + ' text-white'}>
                            {PROJETO_STATUS_LABEL[p.status]?.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClienteFormDialog
        open={openEdit}
        onOpenChange={setOpenEdit}
        cliente={cliente}
        onSuccess={() => {
          setOpenEdit(false)
          loadData()
        }}
      />
    </div>
  )
}
