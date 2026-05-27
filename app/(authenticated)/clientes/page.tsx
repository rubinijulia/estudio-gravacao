'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, AlertCircle, Eye, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ClienteFormDialog } from './cliente-form-dialog'
import { ExcluirClienteDialog } from './excluir-cliente-dialog'
import { formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { isCadastroCompleto, camposFaltando } from '@/lib/cliente'
import Link from 'next/link'

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mostrarExcluidos, setMostrarExcluidos] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)
  const [openExcluirDialog, setOpenExcluirDialog] = useState(false)
  const [editingCliente, setEditingCliente] = useState<any>(null)
  const [clienteParaExcluir, setClienteParaExcluir] = useState<any>(null)

  const supabase = createClient()

  async function loadClientes() {
    setLoading(true)
    let query = supabase.from('clientes').select('*').order('nome')

    if (!mostrarExcluidos) {
      query = query.or('ativo.is.null,ativo.eq.true')
    }

    const { data, error } = await query

    if (error) {
      toast.error('Erro ao carregar clientes')
      console.error(error)
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadClientes()
  }, [mostrarExcluidos])

  async function handleRestaurar(cliente: any) {
    if (!confirm(`Restaurar o cliente "${cliente.nome}"?`)) return

    const { error } = await supabase
      .from('clientes')
      .update({
        ativo: true,
        motivo_exclusao: null,
        data_exclusao: null,
        excluido_por: null,
      })
      .eq('id', cliente.id)

    if (error) {
      toast.error('Erro ao restaurar')
    } else {
      toast.success('Cliente restaurado!')
      loadClientes()
    }
  }

  const filteredClientes = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search)
  )

  const excluidosCount = clientes.filter(c => c.ativo === false).length

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua base de clientes
          </p>
        </div>
        <Button onClick={() => { setEditingCliente(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarExcluidos}
              onChange={(e) => setMostrarExcluidos(e.target.checked)}
            />
            <span>Mostrar clientes excluídos {mostrarExcluidos && excluidosCount > 0 && `(${excluidosCount})`}</span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => {
                  const completo = isCadastroCompleto(cliente)
                  const faltam = camposFaltando(cliente)
                  const excluido = cliente.ativo === false

                  return (
                    <TableRow key={cliente.id} className={excluido ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {cliente.id.substring(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/clientes/${cliente.id}`} className="hover:underline text-primary">
                          {cliente.nome}
                        </Link>
                        {excluido && (
                          <div className="text-xs text-muted-foreground italic">
                            Excluído em {formatDate(cliente.data_exclusao)}: {cliente.motivo_exclusao}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{cliente.email || '-'}</TableCell>
                      <TableCell>{cliente.telefone || '-'}</TableCell>
                      <TableCell>{cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : '-'}</TableCell>
                      <TableCell>
                        {excluido ? (
                          <Badge variant="secondary">Excluído</Badge>
                        ) : !completo ? (
                          <div>
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Incompleto
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              Falta: {faltam.join(', ')}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="default" className="bg-green-600">Completo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {excluido ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Restaurar"
                              onClick={() => handleRestaurar(cliente)}
                            >
                              <RotateCcw className="h-4 w-4 text-blue-600" />
                            </Button>
                          ) : (
                            <>
                              <Link href={`/clientes/${cliente.id}`}>
                                <Button variant="ghost" size="sm" title="Ver detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Editar"
                                onClick={() => { setEditingCliente(cliente); setOpenDialog(true) }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Excluir"
                                onClick={() => { setClienteParaExcluir(cliente); setOpenExcluirDialog(true) }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClienteFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        cliente={editingCliente}
        onSuccess={() => {
          setOpenDialog(false)
          loadClientes()
        }}
      />

      <ExcluirClienteDialog
        open={openExcluirDialog}
        onOpenChange={setOpenExcluirDialog}
        cliente={clienteParaExcluir}
        onSuccess={() => {
          setOpenExcluirDialog(false)
          setClienteParaExcluir(null)
          loadClientes()
        }}
      />
    </div>
  )
}
