'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  Calendar,
  Film,
  Scissors,
  Palette,
  Captions,
  GripVertical,
  Plus,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, getDaysUntilDate, getTodayLocal } from '@/lib/formatters'
import { useRealtime } from '@/lib/use-realtime'
import { ProjetoFormDialog } from './projeto-form-dialog'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { useUser } from '@/lib/use-user'

const COLUNAS = [
  { id: 'gravado', label: 'Gravado', color: 'bg-slate-500' },
  { id: 'editando', label: 'Editando', color: 'bg-blue-500' },
  { id: 'cortes', label: 'Cortes', color: 'bg-purple-500' },
  { id: 'enviado', label: 'Enviado', color: 'bg-yellow-500' },
  { id: 'em_ajuste', label: 'Em Ajuste', color: 'bg-orange-500' },
  { id: 'finalizado', label: 'Finalizado', color: 'bg-green-600' },
]

const STATUS_ORDER = COLUNAS.map(c => c.id)

// Card draggable
function ProjetoCard({ projeto, isDragging = false, onEdit }: { projeto: any; isDragging?: boolean; onEdit?: (p: any) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: projeto.id,
    data: { projeto },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const diasAteEntrega = getDaysUntilDate(new Date(projeto.data_entrega_prevista))
  const atrasado = diasAteEntrega < 0 && projeto.status !== 'finalizado'

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <Card className={`${atrasado ? 'border-red-500 border-2' : ''} touch-none group`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none mt-1 text-muted-foreground hover:text-foreground"
              title="Arrastar"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{projeto.clientes?.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{projeto.titulo}</div>
            </div>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(projeto) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                title="Editar"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs pl-6">
            <Calendar className="h-3 w-3" />
            <span className={atrasado ? 'text-red-600 font-semibold' : ''}>
              {formatDate(projeto.data_entrega_prevista)}
            </span>
            {atrasado && (
              <Badge variant="destructive" className="ml-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                {Math.abs(diasAteEntrega)}d
              </Badge>
            )}
          </div>

          <div className="flex gap-1 pl-6 flex-wrap">
            {projeto.tem_edicao && (
              <Badge variant="outline" className="text-xs" title="Edição">
                <Film className="h-3 w-3" />
              </Badge>
            )}
            {projeto.tem_cortes && (
              <Badge variant="outline" className="text-xs" title={`${projeto.quantidade_cortes} cortes`}>
                <Scissors className="h-3 w-3" />
                {projeto.quantidade_cortes > 0 && <span className="ml-1">{projeto.quantidade_cortes}</span>}
              </Badge>
            )}
            {projeto.tem_identidade_visual && (
              <Badge variant="outline" className="text-xs" title="Identidade visual">
                <Palette className="h-3 w-3" />
              </Badge>
            )}
            {projeto.tem_legendas && (
              <Badge variant="outline" className="text-xs" title="Legendas">
                <Captions className="h-3 w-3" />
              </Badge>
            )}
          </div>

          {projeto.users_profile?.nome && (
            <div className="text-xs text-muted-foreground pl-6">
              👤 {projeto.users_profile.nome}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Coluna droppable
function ColunaKanban({ coluna, projetos, isAdmin, onEdit }: { coluna: any; projetos: any[]; isAdmin: boolean; onEdit: (p: any) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: coluna.id,
    data: { status: coluna.id },
  })

  return (
    <div className="flex flex-col">
      <div className={`${coluna.color} text-white px-3 py-2 rounded-t-lg flex items-center justify-between`}>
        <span className="font-semibold text-sm">{coluna.label}</span>
        <Badge variant="secondary" className="bg-white/20 text-white">
          {projetos.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`bg-muted/30 rounded-b-lg p-2 min-h-[200px] space-y-2 transition-colors ${
          isOver ? 'bg-blue-100/50 ring-2 ring-blue-400' : ''
        }`}
      >
        {projetos.map(projeto => (
          <ProjetoCard key={projeto.id} projeto={projeto} onEdit={onEdit} />
        ))}
        {projetos.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Arraste cards aqui
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [esconderFinalizados, setEsconderFinalizados] = useState(true)
  const [activeDrag, setActiveDrag] = useState<any>(null)
  const [openForm, setOpenForm] = useState(false)
  const [editingProjeto, setEditingProjeto] = useState<any>(null)
  const { user } = useUser()

  const supabase = createClient()
  const isAdmin = user?.role === 'admin'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  async function loadProjetos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .order('data_entrega_prevista', { ascending: true })

    if (error) {
      toast.error('Erro ao carregar projetos')
      console.error(error)
    } else {
      setProjetos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadProjetos()
  }, [])

  // 🔴 Realtime: kanban atualiza quando alguém move card ou cria projeto
  useRealtime('projetos', loadProjetos)

  function handleDragStart(event: DragStartEvent) {
    const projeto = event.active.data.current?.projeto
    setActiveDrag(projeto)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null)

    const { active, over } = event
    if (!over) return

    const projeto = active.data.current?.projeto
    const novoStatus = over.data.current?.status

    if (!projeto || !novoStatus || projeto.status === novoStatus) return

    // Validar se pode pular etapas (só admin pode)
    const indexAtual = STATUS_ORDER.indexOf(projeto.status)
    const novoIndex = STATUS_ORDER.indexOf(novoStatus)
    const diferenca = Math.abs(novoIndex - indexAtual)

    if (!isAdmin && diferenca > 1) {
      toast.error('Você só pode mover para a próxima ou anterior etapa. Admin pode mover livremente.')
      return
    }

    // Atualização otimista
    const projetosAntigos = [...projetos]
    setProjetos(prev =>
      prev.map(p => (p.id === projeto.id ? { ...p, status: novoStatus } : p))
    )

    const updates: any = { status: novoStatus }
    if (novoStatus === 'finalizado') {
      updates.data_entrega_real = getTodayLocal()
    }

    const { error } = await supabase.from('projetos').update(updates).eq('id', projeto.id)

    if (error) {
      toast.error('Erro ao mover projeto')
      setProjetos(projetosAntigos) // rollback
    } else {
      toast.success(`Movido para ${COLUNAS.find(c => c.id === novoStatus)?.label}`)
    }
  }

  const projetosFiltrados = esconderFinalizados
    ? projetos.filter(p => p.status !== 'finalizado')
    : projetos

  const projetosPorColuna = COLUNAS.reduce((acc: any, col) => {
    acc[col.id] = projetosFiltrados.filter(p => p.status === col.id)
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground mt-1">
            Kanban de produção · <span className="text-xs">Arraste os cards para mover</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={esconderFinalizados}
              onChange={(e) => setEsconderFinalizados(e.target.checked)}
            />
            Esconder finalizados
          </label>
          <Button onClick={() => { setEditingProjeto(null); setOpenForm(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      ) : projetos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-4">
              Nenhum projeto ainda. Os projetos podem ser criados automaticamente ao fazer o check de uma gravação na Agenda
              <br />OU manualmente clicando em <strong>"Novo Projeto"</strong>.
            </p>
            <Button onClick={() => { setEditingProjeto(null); setOpenForm(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {COLUNAS.map((col) => (
              <ColunaKanban
                key={col.id}
                coluna={col}
                projetos={projetosPorColuna[col.id] || []}
                isAdmin={isAdmin}
                onEdit={(p) => { setEditingProjeto(p); setOpenForm(true) }}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDrag && (
              <div className="rotate-3 opacity-90">
                <ProjetoCard projeto={activeDrag} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <ProjetoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        projeto={editingProjeto}
        onSuccess={() => {
          setOpenForm(false)
          loadProjetos()
        }}
      />

      {!isAdmin && (
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          💡 <strong>Dica:</strong> Você pode mover cards apenas para a próxima ou anterior coluna.
          Admin pode mover livremente entre qualquer coluna.
        </div>
      )}
    </div>
  )
}
