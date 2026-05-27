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
import { Autocomplete } from '@/components/ui/autocomplete'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  custo?: any
  onSuccess: () => void
}

export function CustoVariavelFormDialog({ open, onOpenChange, custo, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [colaboradores, setColaboradores] = useState<any[]>([])
  const [formData, setFormData] = useState({
    competencia: new Date().toISOString().substring(0, 7) + '-01',
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
      .in('role', ['editor', 'operacional'])
      .eq('ativo', true)
    setColaboradores(data || [])
  }

  useEffect(() => {
    if (custo) {
      setFormData({
        competencia: custo.competencia || '',
        descricao: custo.descricao || '',
        colaborador_id: custo.colaborador_id || '',
        horas_trabalhadas: String(custo.horas_trabalhadas || ''),
        valor_hora: String(custo.valor_hora || ''),
        valor_total: String(custo.valor_total || ''),
      })
    } else {
      setFormData({
        competencia: new Date().toISOString().substring(0, 7) + '-01',
        descricao: '',
        colaborador_id: '',
        horas_trabalhadas: '',
        valor_hora: '',
        valor_total: '',
      })
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
    const horas = parseFloat(formData.horas_trabalhadas) || 0
    const valorHora = parseFloat(formData.valor_hora) || 0
    if (horas && valorHora) {
      setFormData(prev => ({
        ...prev,
        valor_total: String(horas * valorHora),
      }))
    }
  }

  useEffect(calcularTotal, [formData.horas_trabalhadas, formData.valor_hora])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        competencia: formData.competencia,
        descricao: formData.descricao,
        colaborador_id: formData.colaborador_id || null,
        horas_trabalhadas: formData.horas_trabalhadas ? parseFloat(formData.horas_trabalhadas) : null,
        valor_hora: formData.valor_hora ? parseFloat(formData.valor_hora) : null,
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
          <DialogDescription>Horas de colaborador, freelas pontuais</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Competência *</Label>
              <Input
                type="month"
                value={formData.competencia.substring(0, 7)}
                onChange={(e) => setFormData({ ...formData, competencia: e.target.value + '-01' })}
                required
              />
            </div>

            {colaboradores.length > 0 && (
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Autocomplete
                  options={colaboradores.map(c => ({ value: c.id, label: c.nome }))}
                  value={formData.colaborador_id}
                  onChange={selectColaborador}
                  placeholder="Selecione (opcional)"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Ex: Horas editor março/26"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Horas Trab.</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.horas_trabalhadas}
                onChange={(e) => setFormData({ ...formData, horas_trabalhadas: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor/Hora</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_hora}
                onChange={(e) => setFormData({ ...formData, valor_hora: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                required
              />
            </div>
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
