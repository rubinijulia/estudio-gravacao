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
import { getTodayLocal, dateToLocalString } from '@/lib/formatters'
import { toast } from 'sonner'
import { addBusinessDays } from 'date-fns'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projeto?: any // se passado, modo edição
  onSuccess: () => void
}

export function ProjetoFormDialog({ open, onOpenChange, projeto, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])
  const [prazoPersonalizado, setPrazoPersonalizado] = useState(false)

  const [formData, setFormData] = useState({
    cliente_id: '',
    venda_id: '',
    titulo: '',
    formato: 'podcast',
    tem_edicao: false,
    tem_cortes: false,
    quantidade_cortes: 0,
    tem_identidade_visual: false,
    tem_legendas: false,
    data_gravacao: getTodayLocal(),
    data_entrega_prevista: '',
    responsavel_id: '',
    arquivos_link: '',
    observacoes: '',
    status: 'gravado',
  })

  const supabase = createClient()
  const modoEdicao = !!projeto

  async function loadData() {
    const [cli, resp] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase
        .from('users_profile')
        .select('id, nome')
        .in('role', ['editor', 'admin'])
        .eq('ativo', true),
    ])
    setClientes(cli.data || [])
    setResponsaveis(resp.data || [])
  }

  async function loadVendasCliente(clienteId: string) {
    if (!clienteId) {
      setVendas([])
      return
    }
    const { data } = await supabase
      .from('vendas')
      .select('id, data_venda, valor_total')
      .eq('cliente_id', clienteId)
      .order('data_venda', { ascending: false })
    setVendas(data || [])
  }

  useEffect(() => {
    if (open) loadData()
  }, [open])

  useEffect(() => {
    if (projeto) {
      setFormData({
        cliente_id: projeto.cliente_id || '',
        venda_id: projeto.venda_id || '',
        titulo: projeto.titulo || '',
        formato: projeto.formato || 'podcast',
        tem_edicao: projeto.tem_edicao || false,
        tem_cortes: projeto.tem_cortes || false,
        quantidade_cortes: projeto.quantidade_cortes || 0,
        tem_identidade_visual: projeto.tem_identidade_visual || false,
        tem_legendas: projeto.tem_legendas || false,
        data_gravacao: projeto.data_gravacao || getTodayLocal(),
        data_entrega_prevista: projeto.data_entrega_prevista || '',
        responsavel_id: projeto.responsavel_id || '',
        arquivos_link: projeto.arquivos_link || '',
        observacoes: projeto.observacoes || '',
        status: projeto.status || 'gravado',
      })
      setPrazoPersonalizado(projeto.prazo_personalizado || false)
      if (projeto.cliente_id) loadVendasCliente(projeto.cliente_id)
    } else {
      setFormData({
        cliente_id: '',
        venda_id: '',
        titulo: '',
        formato: 'podcast',
        tem_edicao: false,
        tem_cortes: false,
        quantidade_cortes: 0,
        tem_identidade_visual: false,
        tem_legendas: false,
        data_gravacao: getTodayLocal(),
        data_entrega_prevista: '',
        responsavel_id: '',
        arquivos_link: '',
        observacoes: '',
        status: 'gravado',
      })
      setPrazoPersonalizado(false)
    }
  }, [projeto, open])

  function calcularPrazo(temEdicao: boolean, dataGravacao: string) {
    if (prazoPersonalizado || !dataGravacao) return
    const dias = temEdicao ? 5 : 3
    const dataPrevista = addBusinessDays(new Date(dataGravacao), dias)
    setFormData(prev => ({
      ...prev,
      tem_edicao: temEdicao,
      data_entrega_prevista: dateToLocalString(dataPrevista),
    }))
  }

  // Recalcular prazo se mudar data de gravação ou se ainda não foi personalizado
  useEffect(() => {
    if (!prazoPersonalizado && formData.data_gravacao && !modoEdicao) {
      calcularPrazo(formData.tem_edicao, formData.data_gravacao)
    }
  }, [formData.data_gravacao])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }
    if (!formData.titulo) {
      toast.error('Informe o título')
      return
    }
    if (!formData.data_entrega_prevista) {
      toast.error('Defina a data de entrega')
      return
    }

    setLoading(true)

    try {
      const data: any = {
        cliente_id: formData.cliente_id,
        venda_id: formData.venda_id || null,
        titulo: formData.titulo,
        formato: formData.formato,
        tem_edicao: formData.tem_edicao,
        tem_cortes: formData.tem_cortes,
        quantidade_cortes: formData.quantidade_cortes,
        tem_identidade_visual: formData.tem_identidade_visual,
        tem_legendas: formData.tem_legendas,
        data_gravacao: formData.data_gravacao,
        data_entrega_prevista: formData.data_entrega_prevista,
        prazo_personalizado: prazoPersonalizado,
        responsavel_id: formData.responsavel_id || null,
        arquivos_link: formData.arquivos_link || null,
        observacoes: formData.observacoes || null,
        status: formData.status,
      }

      if (modoEdicao) {
        // Se mudou para finalizado, registra data_entrega_real
        if (formData.status === 'finalizado' && !projeto.data_entrega_real) {
          data.data_entrega_real = getTodayLocal()
        }
        const { error } = await supabase.from('projetos').update(data).eq('id', projeto.id)
        if (error) throw error
        toast.success('Projeto atualizado!')
      } else {
        const { error } = await supabase.from('projetos').insert(data)
        if (error) throw error
        toast.success('Projeto criado!')
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modoEdicao ? 'Editar' : 'Novo'} Projeto</DialogTitle>
          <DialogDescription>
            {modoEdicao
              ? 'Edite as informações do projeto'
              : 'Crie um projeto manualmente (sem vincular a agendamento)'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Autocomplete
              options={clientes.map(c => ({ value: c.id, label: c.nome }))}
              value={formData.cliente_id}
              onChange={(v) => {
                setFormData({ ...formData, cliente_id: v, venda_id: '' })
                loadVendasCliente(v)
              }}
              placeholder="Buscar cliente..."
            />
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ex: Podcast Episódio 5 - João Silva"
              required
            />
          </div>

          {vendas.length > 0 && (
            <div className="space-y-2">
              <Label>Vincular a Venda (opcional)</Label>
              <Autocomplete
                options={vendas.map(v => ({
                  value: v.id,
                  label: `Venda ${new Date(v.data_venda).toLocaleDateString('pt-BR')}`,
                  description: `R$ ${Number(v.valor_total).toFixed(2)}`,
                }))}
                value={formData.venda_id}
                onChange={(v) => setFormData({ ...formData, venda_id: v })}
                placeholder="Sem venda vinculada"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Formato *</Label>
              <Select
                value={formData.formato}
                onValueChange={(v) => setFormData({ ...formData, formato: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="podcast">Podcast</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="video_curso">Vídeo de Curso</SelectItem>
                  <SelectItem value="video_institucional">Vídeo Institucional</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modoEdicao && (
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gravado">Gravado</SelectItem>
                    <SelectItem value="editando">Editando</SelectItem>
                    <SelectItem value="cortes">Cortes</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="em_ajuste">Em Ajuste</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_edicao}
                onChange={(e) => {
                  setFormData({ ...formData, tem_edicao: e.target.checked })
                  if (!prazoPersonalizado) calcularPrazo(e.target.checked, formData.data_gravacao)
                }}
              />
              <span className="text-sm">Tem edição</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_cortes}
                onChange={(e) => setFormData({ ...formData, tem_cortes: e.target.checked })}
              />
              <span className="text-sm">Pacote de cortes</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_identidade_visual}
                onChange={(e) => setFormData({ ...formData, tem_identidade_visual: e.target.checked })}
              />
              <span className="text-sm">Identidade visual</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.tem_legendas}
                onChange={(e) => setFormData({ ...formData, tem_legendas: e.target.checked })}
              />
              <span className="text-sm">Legendas</span>
            </label>
          </div>

          {formData.tem_cortes && (
            <div className="space-y-2">
              <Label>Quantidade de cortes</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantidade_cortes}
                onChange={(e) => setFormData({ ...formData, quantidade_cortes: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Gravação *</Label>
              <Input
                type="date"
                value={formData.data_gravacao}
                onChange={(e) => setFormData({ ...formData, data_gravacao: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Prazo de Entrega *</Label>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => {
                    setPrazoPersonalizado(!prazoPersonalizado)
                    if (prazoPersonalizado) {
                      // Voltou para automático
                      calcularPrazo(formData.tem_edicao, formData.data_gravacao)
                    }
                  }}
                >
                  {prazoPersonalizado ? 'Voltar p/ automático' : 'Personalizar'}
                </button>
              </div>
              <Input
                type="date"
                value={formData.data_entrega_prevista}
                onChange={(e) => {
                  setFormData({ ...formData, data_entrega_prevista: e.target.value })
                  setPrazoPersonalizado(true)
                }}
                required
              />
            </div>
          </div>

          {/* Responsável - destaque visual */}
          <div className="space-y-2 p-3 border-2 border-blue-200 bg-blue-50 rounded-lg">
            <Label className="text-blue-900">Editor Responsável</Label>
            <Autocomplete
              options={responsaveis.map(r => ({ value: r.id, label: r.nome }))}
              value={formData.responsavel_id}
              onChange={(v) => setFormData({ ...formData, responsavel_id: v })}
              placeholder="Selecionar responsável..."
              emptyMessage="Nenhum editor cadastrado"
            />
            {responsaveis.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre editores em Configurações → Usuários
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Link dos arquivos brutos</Label>
            <Input
              type="url"
              value={formData.arquivos_link}
              onChange={(e) => setFormData({ ...formData, arquivos_link: e.target.value })}
              placeholder="https://drive.google.com/..."
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : modoEdicao ? 'Salvar Alterações' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
