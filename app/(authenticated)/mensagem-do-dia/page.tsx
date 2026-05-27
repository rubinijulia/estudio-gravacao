'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Copy, Check, RefreshCw, Send, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { dateToLocalString } from '@/lib/formatters'

export default function MensagemDoDiaPage() {
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [contadores, setContadores] = useState({
    gravacoes: 0,
    entregas: 0,
    atrasos: 0,
    em_andamento: 0,
    pagamentos_revisar: 0,
    pagamentos_cobrar: 0,
    nfs_emitir: 0,
  })
  const [copiado, setCopiado] = useState(false)
  const [data, setData] = useState(() => {
    // Default: AMANHÃ
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    return dateToLocalString(amanha)
  })
  const [numeroWhats, setNumeroWhats] = useState('')

  async function gerarMensagem() {
    setLoading(true)
    setCopiado(false)
    try {
      const res = await fetch(`/api/gerar-mensagem?data=${data}`)
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Erro ao gerar mensagem')
        return
      }

      setMensagem(json.mensagem)
      setContadores({
        gravacoes: json.total_gravacoes,
        entregas: json.total_entregas,
        atrasos: json.total_atrasos,
        em_andamento: json.total_em_andamento || 0,
        pagamentos_revisar: json.total_pagamentos_revisar || 0,
        pagamentos_cobrar: json.total_pagamentos_cobrar || 0,
        nfs_emitir: json.total_nfs_emitir || 0,
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    gerarMensagem()
  }, [data])

  function copiar() {
    navigator.clipboard.writeText(mensagem)
    setCopiado(true)
    toast.success('Mensagem copiada!')
    setTimeout(() => setCopiado(false), 2000)
  }

  function abrirWhatsAppGrupo() {
    // Abre WhatsApp Web com mensagem pré-preenchida (sem destinatário)
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  function abrirWhatsAppNumero() {
    if (!numeroWhats) {
      toast.error('Digite um número de WhatsApp')
      return
    }
    // Remove tudo que não for número
    const numeroLimpo = numeroWhats.replace(/\D/g, '')
    const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
  }

  // Helpers de data
  function setHoje() {
    setData(dateToLocalString(new Date()))
  }
  function setAmanha() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    setData(dateToLocalString(d))
  }

  const hoje = dateToLocalString(new Date())
  const ehAmanha = data > hoje
  const ehHoje = data === hoje

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="h-7 w-7" />
          Mensagem do Dia
        </h1>
        <p className="text-muted-foreground mt-1">
          Gere a mensagem com a agenda do dia e envie para a equipe via WhatsApp
        </p>
      </div>

      {/* Seleção de data */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="font-medium">Resumo de:</Label>
            <Button
              variant={ehHoje ? 'default' : 'outline'}
              size="sm"
              onClick={setHoje}
            >
              Hoje
            </Button>
            <Button
              variant={ehAmanha ? 'default' : 'outline'}
              size="sm"
              onClick={setAmanha}
            >
              Amanhã
            </Button>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="sm" onClick={gerarMensagem} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contadores rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>🎬 Gravações</CardDescription>
            <CardTitle className="text-3xl">{contadores.gravacoes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>📦 Entregas</CardDescription>
            <CardTitle className="text-3xl">{contadores.entregas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>🎞️ Em Andamento</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{contadores.em_andamento}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={contadores.atrasos > 0 ? 'border-red-300 bg-red-50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>🚨 Atrasos</CardDescription>
            <CardTitle className={`text-3xl ${contadores.atrasos > 0 ? 'text-red-600' : ''}`}>
              {contadores.atrasos}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={contadores.pagamentos_revisar > 0 ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>💰 Pagamentos</CardDescription>
            <CardTitle className={`text-3xl ${contadores.pagamentos_revisar > 0 ? 'text-orange-600' : ''}`}>
              {contadores.pagamentos_revisar}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={contadores.nfs_emitir > 0 ? 'border-purple-300 bg-purple-50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>📄 NFs Pendentes</CardDescription>
            <CardTitle className={`text-3xl ${contadores.nfs_emitir > 0 ? 'text-purple-600' : ''}`}>
              {contadores.nfs_emitir}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Preview da mensagem */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📱 Preview da Mensagem</CardTitle>
            <Button onClick={copiar} variant={copiado ? 'default' : 'outline'}>
              {copiado ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Estilo bolha WhatsApp */}
          <div className="bg-[#e5ddd5] p-4 rounded-lg">
            <div className="bg-[#dcf8c6] p-3 rounded-lg shadow whitespace-pre-wrap font-sans text-sm max-w-md ml-auto">
              {loading ? 'Gerando...' : mensagem}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Envio direto */}
      <Card>
        <CardHeader>
          <CardTitle>📤 Enviar via WhatsApp</CardTitle>
          <CardDescription>
            Abre WhatsApp Web/App com a mensagem pronta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={abrirWhatsAppGrupo}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <Send className="h-5 w-5 mr-2" />
            Abrir WhatsApp (escolher destinatário)
          </Button>

          <div className="text-center text-sm text-muted-foreground">ou</div>

          <div className="space-y-2">
            <Label>Enviar direto para um número:</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 11999999999 (com DDD, sem +55)"
                value={numeroWhats}
                onChange={(e) => setNumeroWhats(e.target.value)}
              />
              <Button onClick={abrirWhatsAppNumero}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Vai abrir o WhatsApp já no chat dessa pessoa com a mensagem pronta. Só clicar em enviar.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-sm">
          <p className="font-semibold mb-1">💡 Dica de uso:</p>
          <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
            <li>À noite, gere a mensagem de <strong>amanhã</strong></li>
            <li>Clica em <strong>"Abrir WhatsApp"</strong></li>
            <li>Escolhe o grupo da equipe</li>
            <li>Mensagem já vai estar pronta - é só apertar enviar! 🚀</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
