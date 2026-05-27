'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { UsuarioFormDialog } from './usuario-form-dialog'
import { formatCurrency } from '@/lib/formatters'
import Link from 'next/link'

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-600' },
  editor: { label: 'Editor', color: 'bg-blue-600' },
  operacional: { label: 'Operacional', color: 'bg-green-600' },
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<any>(null)

  const supabase = createClient()

  async function loadUsuarios() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .order('nome')

    if (error) {
      toast.error('Erro ao carregar usuários')
      console.error(error)
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.')) return

    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Usuário excluído!')
      loadUsuarios()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" />
            Voltar para Configurações
          </Link>
          <h1 className="text-3xl font-bold">Usuários da Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie acessos e permissões</p>
        </div>
        <Button onClick={() => { setEditingUsuario(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Valor/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.nome}
                      <div className="text-xs font-mono text-muted-foreground">
                        {u.id.substring(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_LABEL[u.role]?.color}>
                        {ROLE_LABEL[u.role]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.valor_hora ? formatCurrency(u.valor_hora) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? 'default' : 'secondary'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingUsuario(u); setOpenDialog(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(u.id)}
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

      <UsuarioFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        usuario={editingUsuario}
        onSuccess={() => {
          setOpenDialog(false)
          loadUsuarios()
        }}
      />
    </div>
  )
}
