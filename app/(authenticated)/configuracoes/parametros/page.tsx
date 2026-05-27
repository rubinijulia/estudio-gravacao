'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Settings, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ParametrosPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, any>>({
    prazo_sem_edicao_dias_uteis: 3,
    prazo_com_edicao_dias_uteis: 5,
    taxa_cartao_credito_percentual: 4.5,
    acrescimo_noturno_fds_percentual: 20,
    horario_inicio_noturno: '20:00',
  })

  const supabase = createClient()

  async function loadConfig() {
    setLoading(true)
    const { data } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .in('chave', [
        'prazo_sem_edicao_dias_uteis',
        'prazo_com_edicao_dias_uteis',
        'taxa_cartao_credito_percentual',
        'acrescimo_noturno_fds_percentual',
        'horario_inicio_noturno',
      ])

    if (data) {
      const obj: Record<string, any> = {}
      data.forEach(c => {
        obj[c.chave] = c.valor
      })
      setConfig({ ...config, ...obj })
    }
    setLoading(false)
  }

  useEffect(() => {
    loadConfig()
  }, [])

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updates = Object.entries(config).map(([chave, valor]) =>
        supabase.from('configuracoes').update({ valor }).eq('chave', chave)
      )

      await Promise.all(updates)
      toast.success('Configurações salvas!')
    } catch (err: any) {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Parâmetros Gerais
        </h1>
        <p className="text-muted-foreground mt-1">Configurações de prazos, taxas e cálculos automáticos</p>
      </div>

      <form onSubmit={salvar} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">📅 Prazos de Entrega</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sem edição (dias úteis)</Label>
                <Input
                  type="number"
                  min="1"
                  value={config.prazo_sem_edicao_dias_uteis}
                  onChange={(e) => setConfig({ ...config, prazo_sem_edicao_dias_uteis: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Prazo padrão para projetos simples</p>
              </div>
              <div className="space-y-2">
                <Label>Com edição (dias úteis)</Label>
                <Input
                  type="number"
                  min="1"
                  value={config.prazo_com_edicao_dias_uteis}
                  onChange={(e) => setConfig({ ...config, prazo_com_edicao_dias_uteis: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Prazo para projetos com edição</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold">💳 Taxas e Acréscimos</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taxa cartão crédito (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.taxa_cartao_credito_percentual}
                  onChange={(e) => setConfig({ ...config, taxa_cartao_credito_percentual: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Acréscimo noturno/FDS (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.acrescimo_noturno_fds_percentual}
                  onChange={(e) => setConfig({ ...config, acrescimo_noturno_fds_percentual: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horário início noturno</Label>
              <Input
                type="time"
                value={config.horario_inicio_noturno}
                onChange={(e) => setConfig({ ...config, horario_inicio_noturno: e.target.value })}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">A partir desse horário, acréscimo noturno se aplica</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
