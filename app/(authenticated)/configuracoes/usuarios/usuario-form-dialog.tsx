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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuario?: any
  onSuccess: () => void
}

export function UsuarioFormDialog({ open, onOpenChange, usuario, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    role: 'editor',
    valor_hora: '',
    ativo: true,
  })

  useEffect(() => {
    if (usuario) {
      setFormData({
        email: '',
        password: '',
        nome: usuario.nome || '',
        role: usuario.role || 'editor',
        valor_hora: String(usuario.valor_hora || ''),
        ativo: usuario.ativo ?? true,
      })
    } else {
      setFormData({
        email: '',
        password: '',
        nome: '',
        role: 'editor',
        valor_hora: '',
        ativo: true,
      })
    }
  }, [usuario, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (usuario) {
        // Atualizar
        const body: any = {
          id: usuario.id,
          nome: formData.nome,
          role: formData.role,
          valor_hora: formData.valor_hora || null,
          ativo: formData.ativo,
        }
        if (formData.password) body.password = formData.password

        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('Usuário atualizado!')
      } else {
        // Criar
        if (!formData.email || !formData.password) {
          toast.error('Email e senha são obrigatórios')
          setLoading(false)
          return
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            role: formData.role,
            valor_hora: formData.valor_hora || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success('Usuário criado!')
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{usuario ? 'Editar' : 'Novo'} Usuário</DialogTitle>
          <DialogDescription>
            {usuario ? 'Atualize os dados ou redefina a senha' : 'Crie um novo acesso para a equipe'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          {!usuario && (
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{usuario ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha *'}</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!usuario}
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Permissão *</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (acesso total)</SelectItem>
                  <SelectItem value="editor">Editor (vendas, agenda, kanban)</SelectItem>
                  <SelectItem value="operacional">Operacional (agenda hoje)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor/Hora (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_hora}
                onChange={(e) => setFormData({ ...formData, valor_hora: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          {usuario && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="ativo">Usuário ativo</Label>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <strong>Permissões:</strong><br />
            • <strong>Admin:</strong> Acesso total (financeiro, configurações, relatórios)<br />
            • <strong>Editor:</strong> Vendas (visualizar), clientes, agenda, projetos<br />
            • <strong>Operacional:</strong> Só agenda do dia + check de gravação
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
