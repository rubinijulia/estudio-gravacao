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
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ServicoFormDialog } from './servico-form-dialog'
import { formatCurrency } from '@/lib/formatters'

const CATEGORIAS_LABEL: Record<string, string> = {
  podcast: 'Podcast',
  hora_avulsa: 'Hora Avulsa',
  plano_mensal: 'Plano Mensal',
  diaria: 'Diária',
  pos_producao: 'Pós-Produção',
  identidade: 'Identidade Visual',
  curso: 'Curso',
  merch: 'Merch',
  outros: 'Outros',
}

export default function ServicosPage() {
  const [servicos, setServicos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingServico, setEditingServico] = useState<any>(null)

  const supabase = createClient()

  async function loadServicos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('nome')

    if (error) {
      toast.error('Erro ao carregar serviços')
      console.error(error)
    } else {
      setServicos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadServicos()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este serviço?')) return

    const { error } = await supabase.from('servicos').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir serviço')
    } else {
      toast.success('Serviço excluído!')
      loadServicos()
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo de serviços oferecidos
          </p>
        </div>
        <Button onClick={() => { setEditingServico(null); setOpenDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : servicos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum serviço cadastrado. Clique em "Novo Serviço" para começar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicos.map((servico) => (
                  <TableRow key={servico.id}>
                    <TableCell className="font-medium">
                      <div>{servico.nome}</div>
                      {servico.descricao && (
                        <div className="text-xs text-muted-foreground">{servico.descricao}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{CATEGORIAS_LABEL[servico.categoria] || servico.categoria}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(servico.valor_padrao)}</TableCell>
                    <TableCell>
                      <Badge variant={servico.ativo ? 'default' : 'secondary'}>
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingServico(servico); setOpenDialog(true) }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(servico.id)}
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

      <ServicoFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        servico={editingServico}
        onSuccess={() => {
          setOpenDialog(false)
          loadServicos()
        }}
      />
    </div>
  )
}
