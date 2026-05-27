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
import { Autocomplete } from '@/components/ui/autocomplete'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { getTodayLocal } from '@/lib/formatters'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  custo?: any
  onSuccess: () => void
}

const CATEGORIAS = [
  { value: 'compras', label: '🛒 Compras / Materiais' },
  { value: 'energia', label: '💡 Energia / Água / Internet' },
  { value: 'freelancer', label: '👨‍💻 Freelancer / Serviços' },
  { value: 'salario_extra', label: '💼 Salário / Horas extras' },
  { value: 'manutencao', label: '🔧 Manutenção / Reparos' },
  { value: 'transporte', label: '🚗 Transporte / Combustível' },
  { value: 'alimentacao', label: '🍕 Alimentação' },
  { value: 'marketing', label: '📢 Marketing pontual' },
  { value: 'imposto', label: '🏛️ Impostos / Taxas' },
  { value: 'outros', label: '📦 Outros' },
]

export function CustoVariavelFormDialog({ open, onOpenChange, custo, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [mostrarHoras, setMostrarHoras] = useState(false)
  const [formData, setFormData] = useState({
    data: getTodayLocal(),
    categoria: 'outros',
    descricao: '',
    colaborador_id: '',
    horas_trabalhadas: '',
    valor_hora: '',
    valor_total: '',
  })

  const supabase = createClient()

  useEffect(() => {
    if (open) loadColaboradores()
  }, [open])

  async function loadColaboradores() {
    const { data } = await supabase
      .from('users_profile')
      .select('id, nome, valor_hora')
      .eq('ativo', true)
    setColaboradores(data || [])
  }

  useEffect(() => {
    if (custo) {
      const data = custo.data || (custo.competencia ? custo.competencia : getTodayLocal())
      setFormData({
        data,
        categoria: custo.categoria || 'outros',
        descricao: custo.descricao || '',
        colaborador_id: custo.colaborador_id || '',
        horas_trabalhadas: String(custo.horas_trabalhadas || ''),
        valor_hora: String(custo.valor_hora || ''),
        valor_total: String(custo.valor_total || ''),
      })
      setMostrarHoras(!!custo.horas_trabalhadas || !!custo.colaborador_id)
    } else {
      setFormData({
        data: getTodayLocal(),
        categoria: 'outros',
        descricao: '',
        colaborador_id: '',
        horas_trabalhadas: '',
        valor_hora: '',
        valor_total: '',
      })
      setMostrarHoras(false)
    }
  }, [custo, open])

  function selectColaborador(id: string) {
    const colab = colaboradores.find(c => c.id === id)
    setFormData({
      ...formData,
      colaborador_id: id,
      valor_hora: colab?.valor_hora ? String(colab.valor_hora) : formData.valor_hora,
    })
  }

  function calcularTotal() {
    if (!mostrarHoras) return
    const horas = parseFloat(formData.horas_trabalhadas) || 0
    const valorHora = parseFloat(formData.valor_hora) || 0
    if (horas && valorHora) {
      setFormData(prev => ({
        ...prev,
        valor_total: String(horas * valorHora),
      }))
    }
  }

  useEffect(calcularTotal, [formData.horas_trabalhadas, formData.valor_hora, mostrarHoras])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Pega 1º dia do mês para competência
      const dataObj = new Date(formData.data + 'T12:00:00')
      const competencia = `${dataObj.getFullYear()}-${String(dataObj.getMonth() + 1).padStart(2, '0')}-01`

      const data = {
        data: formData.data,
        competencia,
        categoria: formData.categoria,
        descricao: formData.descricao,
        colaborador_id: mostrarHoras ? (formData.colaborador_id || null) : null,
        horas_trabalhadas: mostrarHoras && formData.horas_trabalhadas ? parseFloat(formData.horas_trabalhadas) : null,
        valor_hora: mostrarHoras && formData.valor_hora ? parseFloat(formData.valor_hora) : null,
        valor_total: parseFloat(formData.valor_total) || 0,
      }

      if (custo) {
        const { error } = await supabase.from('custos_variaveis').update(data).eq('id', custo.id)
        if (error) throw error
        toast.success('Custo atualizado!')
      } else {
        const { error } = await supabase.from('custos_variaveis').insert(data)
        if (error) throw error
        toast.success('Custo cadastrado!')
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
          <DialogTitle>{custo ? 'Editar' : 'Novo'} Custo Variável</DialogTitle>
          <DialogDescription>Despesas pontuais: compras, energia, freelas, manutenção, etc.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Despesa *</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Compra de cabos, Conta de luz, Reparo do microfone..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.valor_total}
              onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
              required
              disabled={mostrarHoras && formData.horas_trabalhadas !== '' && formData.valor_hora !== ''}
            />
            {mostrarHoras && formData.horas_trabalhadas && formData.valor_hora && (
              <p className="text-xs text-muted-foreground">
                Valor calculado automaticamente: {formData.horas_trabalhadas}h × R$ {formData.valor_hora}/h
              </p>
            )}
          </div>

          {/* Toggle horas/colaborador (opcional) */}
          <div className="border-t pt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mostrarHoras}
                onChange={(e) => setMostrarHoras(e.target.checked)}
              />
              <span>Vincular a colaborador / horas trabalhadas (opcional)</span>
            </label>

            {mostrarHoras && (
              <div className="mt-3 space-y-3 p-3 bg-muted/30 rounded-lg">
                {colaboradores.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">Colaborador</Label>
                    <Autocomplete
                      options={colaboradores.map(c => ({ value: c.id, label: c.nome }))}
                      value={formData.colaborador_id}
                      onChange={selectColaborador}
                      placeholder="Selecione (opcional)"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Horas Trab.</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.horas_trabalhadas}
                      onChange={(e) => setFormData({ ...formData, horas_trabalhadas: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Valor/Hora</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_hora}
                      onChange={(e) => setFormData({ ...formData, valor_hora: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
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
