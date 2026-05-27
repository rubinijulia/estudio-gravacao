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
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  servico?: any
  onSuccess: () => void
}

export function ServicoFormDialog({ open, onOpenChange, servico, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'podcast',
    valor_padrao: '',
    descricao: '',
    ativo: true,
  })

  const supabase = createClient()

  useEffect(() => {
    if (servico) {
      setFormData({
        nome: servico.nome || '',
        categoria: servico.categoria || 'podcast',
        valor_padrao: String(servico.valor_padrao || ''),
        descricao: servico.descricao || '',
        ativo: servico.ativo ?? true,
      })
    } else {
      setFormData({
        nome: '',
        categoria: 'podcast',
        valor_padrao: '',
        descricao: '',
        ativo: true,
      })
    }
  }, [servico, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        valor_padrao: parseFloat(formData.valor_padrao) || 0,
      }

      if (servico) {
        const { error } = await supabase
          .from('servicos')
          .update(data)
          .eq('id', servico.id)
        if (error) throw error
        toast.success('Serviço atualizado!')
      } else {
        const { error } = await supabase.from('servicos').insert(data)
        if (error) throw error
        toast.success('Serviço cadastrado!')
      }
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar serviço')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{servico ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do serviço
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="hora_avulsa">Hora Avulsa</SelectItem>
                  <SelectItem value="plano_mensal">Plano Mensal</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="pos_producao">Pós-Produção</SelectItem>
                  <SelectItem value="identidade">Identidade Visual</SelectItem>
                  <SelectItem value="curso">Curso</SelectItem>
                  <SelectItem value="merch">Merch</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_padrao">Valor (R$) *</Label>
              <Input
                id="valor_padrao"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_padrao}
                onChange={(e) => setFormData({ ...formData, valor_padrao: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="ativo"
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="ativo">Serviço ativo</Label>
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
