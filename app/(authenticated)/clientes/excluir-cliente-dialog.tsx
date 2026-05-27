'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: any
  onSuccess: () => void
}

export function ExcluirClienteDialog({ open, onOpenChange, cliente, onSuccess }: Props) {
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleExcluir() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da exclusão')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('clientes')
        .update({
          ativo: false,
          motivo_exclusao: motivo,
          data_exclusao: new Date().toISOString(),
          excluido_por: user?.id,
        })
        .eq('id', cliente.id)

      if (error) throw error

      toast.success('Cliente excluído. Histórico preservado.')
      setMotivo('')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Cliente
          </DialogTitle>
          <DialogDescription>
            <strong>{cliente?.nome}</strong> será marcado como excluído. O histórico de vendas, projetos e agendamentos será preservado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Motivo da exclusão *</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente cancelou contrato, dados duplicados, solicitação do cliente..."
              rows={3}
              required
            />
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
            ℹ️ <strong>Importante:</strong> O cliente não aparecerá mais nas listagens, mas você pode visualizar
            clientes excluídos ativando a opção "Mostrar excluídos" na tela de Clientes.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleExcluir} disabled={loading || !motivo.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Confirmar Exclusão'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
