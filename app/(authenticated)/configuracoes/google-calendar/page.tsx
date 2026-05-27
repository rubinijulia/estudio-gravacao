'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, CheckCircle2, XCircle, Loader2, Unlink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function GoogleCalendarPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<{
    connected: boolean
    email?: string
    connected_at?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  async function loadStatus() {
    setLoading(true)
    try {
      const res = await fetch('/api/google/status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()

    // Mensagens do callback
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'true') {
      toast.success('Google Calendar conectado com sucesso!')
    }
    if (error) {
      toast.error(`Erro ao conectar: ${error}`)
    }
  }, [searchParams])

  function conectar() {
    window.location.href = '/api/google/auth'
  }

  async function desconectar() {
    if (!confirm('Tem certeza que deseja desconectar o Google Calendar? Novos agendamentos não serão mais sincronizados.')) return
    setDisconnecting(true)
    try {
      const res = await fetch('/api/google/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao desconectar')
      toast.success('Google Calendar desconectado!')
      loadStatus()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7" />
          Google Calendar
        </h1>
        <p className="text-muted-foreground mt-1">
          Sincronize automaticamente seus agendamentos com Google Calendar
        </p>
      </div>

      {/* Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Status da Conexão</CardTitle>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : status?.connected ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-2 text-orange-600">
                <XCircle className="h-5 w-5" />
                Não conectado
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Verificando status...</p>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm">
                  <strong>Conta conectada:</strong> {status.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conectado em {status.connected_at ? new Date(status.connected_at).toLocaleDateString('pt-BR') : '-'}
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-semibold mb-2">✨ O que está sincronizando:</p>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Novos agendamentos criados no sistema</li>
                  <li>Edições de agendamentos</li>
                  <li>Cancelamentos / exclusões</li>
                </ul>
                <p className="mt-3 text-xs">
                  💡 Para vincular cada estúdio ao calendário Google correto, vá em{' '}
                  <Link href="/configuracoes/estudios" className="underline">
                    Configurações → Estúdios
                  </Link>
                </p>
              </div>

              <Button variant="outline" onClick={desconectar} disabled={disconnecting}>
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 mr-2" />
                )}
                Desconectar Google
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Google para sincronizar agendamentos automaticamente.
              </p>
              <Button onClick={conectar} size="lg">
                <Calendar className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                <p className="font-semibold mb-2">🔐 Permissões solicitadas:</p>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Criar, editar e excluir eventos nos seus calendários</li>
                  <li>Ler lista de calendários (para vincular aos estúdios)</li>
                </ul>
                <p className="mt-2 text-muted-foreground">
                  Não acessamos eventos existentes nem suas informações pessoais.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos passos */}
      {status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Próximos passos</CardTitle>
            <CardDescription>
              Configure os estúdios para enviarem para os calendários certos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/configuracoes/estudios">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Configurar Estúdios e seus calendários Google
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
