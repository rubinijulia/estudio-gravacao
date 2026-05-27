'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Webhook, Copy, Check, MessageCircle, Eye, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function IntegracoesPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  const apiKey = 'estudio_julia_2026_xK9mP2qL5nR8vT3w'
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const urlJson = `${baseUrl}/api/resumo-diario?key=${apiKey}`
  const urlTexto = `${baseUrl}/api/resumo-diario?key=${apiKey}&formato=texto`

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast.success('Copiado!')
    setTimeout(() => setCopied(null), 2000)
  }

  async function gerarPreview() {
    setLoadingPreview(true)
    try {
      const res = await fetch(urlTexto)
      const texto = await res.text()
      setPreview(texto)
    } catch (err) {
      toast.error('Erro ao gerar preview')
    } finally {
      setLoadingPreview(false)
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
          <Webhook className="h-7 w-7" />
          Integrações
        </h1>
        <p className="text-muted-foreground mt-1">
          APIs para integrar com Cowork, WhatsApp, Zapier, n8n, etc.
        </p>
      </div>

      {/* API de Resumo Diário */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Resumo Diário (API)
          </CardTitle>
          <CardDescription>
            Endpoint que retorna o resumo do dia para envio automático no WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">URL (JSON):</p>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded text-xs break-all">
                {urlJson}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyText(urlJson, 'json')}>
                {copied === 'json' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">URL (Texto pronto para WhatsApp):</p>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded text-xs break-all">
                {urlTexto}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyText(urlTexto, 'texto')}>
                {copied === 'texto' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
            <strong>⚠️ Segurança:</strong> A chave de API está nesta URL. Nunca compartilhe publicamente.
            Use somente nas suas integrações (Cowork, Zapier, n8n).
          </div>

          <Button onClick={gerarPreview} disabled={loadingPreview} variant="outline" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            {loadingPreview ? 'Gerando...' : 'Visualizar Mensagem Pronta'}
          </Button>

          {preview && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Preview do WhatsApp:</p>
              <div className="bg-[#e5ddd5] p-4 rounded-lg">
                <div className="bg-white p-3 rounded-lg shadow whitespace-pre-wrap font-sans text-sm max-w-md">
                  {preview}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Como usar */}
      <Card>
        <CardHeader>
          <CardTitle>🤖 Como integrar com Cowork</CardTitle>
          <CardDescription>
            Configure um agente agendado que envia a mensagem todo dia às 8h
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Passo 1: Configurar acesso ao sistema</h3>
            <p className="text-sm text-muted-foreground">
              Você precisa hospedar este sistema na internet (ex: Vercel) para o Cowork conseguir acessá-lo.
              Localmente (localhost) não funciona porque o Cowork não tem acesso à sua rede.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Passo 2: Criar agente no Cowork</h3>
            <p className="text-sm text-muted-foreground mb-2">
              No Cowork, crie um agente agendado com este prompt:
            </p>
            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono whitespace-pre-wrap">
{`Você é um assistente que envia o resumo diário do meu estúdio
de gravação para o WhatsApp.

Toda manhã, faça o seguinte:
1. Busque o resumo via GET: ${urlTexto}
2. O retorno já vem formatado como mensagem
3. Envie a mensagem para o WhatsApp +5511XXXXXXXXX
   usando o provedor [Twilio/Z-API/Meta]

Se houver erro, me avise.`}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Passo 3: Configurar agendamento</h3>
            <p className="text-sm text-muted-foreground">
              No Cowork, configure o agente para rodar todo dia às <strong>08:00</strong>.
              Use cron: <code className="bg-muted px-2 py-1 rounded">0 8 * * *</code>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Passo 4: Provedores de WhatsApp suportados</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>
                <strong>Z-API</strong> (Brasil) -
                <a href="https://z-api.io" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 ml-1">
                  z-api.io <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <strong>Twilio</strong> -
                <a href="https://twilio.com" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 ml-1">
                  twilio.com <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <strong>WhatsApp Cloud API (Meta)</strong> -
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 ml-1">
                  developers.facebook.com <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>💡 Alternativas sem Cowork:</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
              <li><strong>Zapier:</strong> Webhook → API → WhatsApp (sem código)</li>
              <li><strong>n8n:</strong> Self-hosted, gratuito, super flexível</li>
              <li><strong>Make.com</strong> (ex-Integromat): Visual, fácil</li>
              <li><strong>Vercel Cron Jobs:</strong> Pode rodar direto neste projeto</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
