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
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { buscarCep, formatarCep } from '@/lib/cep'
import { Loader2, Search } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: any
  onSuccess: () => void
}

export function ClienteFormDialog({ open, onOpenChange, cliente, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    instagram: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: '',
    cadastro_completo: true,
  })

  const supabase = createClient()

  useEffect(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        documento: cliente.documento || '',
        instagram: cliente.instagram || '',
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        observacoes: cliente.observacoes || '',
        cadastro_completo: cliente.cadastro_completo ?? true,
      })
    } else {
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        documento: '',
        instagram: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        observacoes: '',
        cadastro_completo: true,
      })
    }
  }, [cliente, open])

  async function handleBuscarCep() {
    if (!formData.cep) return
    setBuscandoCep(true)
    try {
      const data = await buscarCep(formData.cep)
      if (!data) {
        toast.error('CEP não encontrado')
        return
      }
      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }))
      toast.success('Endereço preenchido!')
    } finally {
      setBuscandoCep(false)
    }
  }

  function handleCepChange(value: string) {
    setFormData({ ...formData, cep: formatarCep(value) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        ...formData,
        cadastro_completo: true, // Ao editar no formulário completo, marca como completo
      }

      if (cliente) {
        const { error } = await supabase
          .from('clientes')
          .update(data)
          .eq('id', cliente.id)
        if (error) throw error
        toast.success('Cliente atualizado!')
      } else {
        const { error } = await supabase.from('clientes').insert(data)
        if (error) throw error
        toast.success('Cliente cadastrado!')
      }
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {cliente?.id && (
              <span className="text-xs font-mono block mb-2">
                ID: {cliente.id}
              </span>
            )}
            Preencha os dados do cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados Básicos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
              Dados Básicos
            </h3>

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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documento">CPF/CNPJ</Label>
                <Input
                  id="documento"
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  placeholder="@usuario"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
              Endereço
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="flex gap-2">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleBuscarCep}
                    disabled={buscandoCep || !formData.cep}
                  >
                    {buscandoCep ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Avenida..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Apto, Bloco..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
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
