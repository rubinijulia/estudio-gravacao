'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, ArrowLeft, Target } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function MetasPage() {
  const [metas, setMetas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingMeta, setEditingMeta] = useState<any>(null)
  const [formData, setFormData] = useState({
    competencia: new Date().toISOString().substring(0, 7),
    meta_vendas: '',
    meta_gravacoes: '',
    observacoes: '',
  })

  const supabase = createClient()

  async function loadMetas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('metas')
      .select('*')
      .order('competencia', { ascending: false })

    if (error) toast.error('Erro ao carregar metas')
    else setMetas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadMetas()
  }, [])

  useEffect(() => {
    if (editingMeta) {
      setFormData({
        competencia: editingMeta.competencia.substring(0, 7),
        meta_vendas: String(editingMeta.meta_vendas || ''),
        meta_gravacoes: String(editingMeta.meta_gravacoes || ''),
        observacoes: editingMeta.observacoes || '',
      })
    } else {
      setFormData({
        competencia: new Date().toISOString().substring(0, 7),
        meta_vendas: '',
        meta_gravacoes: '',
        observacoes: '',
      })
    }
  }, [editingMeta, openDialog])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const data = {
        competencia: formData.competencia + '-01',
        meta_vendas: parseFloat(formData.meta_vendas) || 0,
        meta_gravacoes: formData.meta_gravacoes ? parseInt(formData.meta_gravacoes) : null,
        observacoes: formData.observacoes || null,
      }

      if (editingMeta) {
        const { error } = await supabase.from('metas').update(data).eq('id', editingMeta.id)
        if (error) throw error
        toast.success('Meta atualizada!')
      } else {
        const { error } = await supabase.from('metas').insert(data)
        if (error) throw error
        toast.success('Meta criada!')
      }
      setOpenDialog(false)
      loadMetas()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta meta?')) return
    const { error } = await supabase.from('metas').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Excluída!'); loadMetas() }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7" />
            Metas Mensais
          </h1>
          <p className="text-muted-foreground mt-1">Defina metas de venda por mês</p>
        </div>
        <Button onClick={() => { setEditingMeta(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : metas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma meta cadastrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Meta de Vendas</TableHead>
                  <TableHead>Meta de Gravações</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {new Date(m.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(m.meta_vendas)}</TableCell>
                    <TableCell>{m.meta_gravacoes || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.observacoes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingMeta(m); setOpenDialog(true) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
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

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMeta ? 'Editar' : 'Nova'} Meta</DialogTitle>
            <DialogDescription>Defina os objetivos do mês</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Mês *</Label>
              <Input
                type="month"
                value={formData.competencia}
                onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Meta de Vendas (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.meta_vendas}
                onChange={(e) => setFormData({ ...formData, meta_vendas: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Meta de Gravações</Label>
              <Input
                type="number"
                value={formData.meta_gravacoes}
                onChange={(e) => setFormData({ ...formData, meta_gravacoes: e.target.value })}
                placeholder="Quantidade"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
