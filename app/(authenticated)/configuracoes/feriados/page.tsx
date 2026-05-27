'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ArrowLeft, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/formatters'
import Link from 'next/link'

export default function FeriadosPage() {
  const [feriados, setFeriados] = useState<{ data: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [novaData, setNovaData] = useState('')
  const [novoNome, setNovoNome] = useState('')

  const supabase = createClient()

  async function loadFeriados() {
    setLoading(true)
    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'feriados')
      .single()

    if (data?.valor && Array.isArray(data.valor)) {
      setFeriados(data.valor)
    } else {
      setFeriados([])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFeriados()
  }, [])

  async function salvar(novosFeriados: typeof feriados) {
    const { error } = await supabase
      .from('configuracoes')
      .update({ valor: novosFeriados })
      .eq('chave', 'feriados')

    if (error) {
      toast.error('Erro ao salvar')
      return false
    }
    setFeriados(novosFeriados)
    return true
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault()
    if (!novaData || !novoNome) return

    if (feriados.find(f => f.data === novaData)) {
      toast.error('Já existe um feriado nessa data')
      return
    }

    const novos = [...feriados, { data: novaData, nome: novoNome }].sort((a, b) =>
      a.data.localeCompare(b.data)
    )

    if (await salvar(novos)) {
      toast.success('Feriado adicionado!')
      setNovaData('')
      setNovoNome('')
    }
  }

  async function remover(data: string) {
    if (!confirm('Remover este feriado?')) return
    const novos = feriados.filter(f => f.data !== data)
    if (await salvar(novos)) {
      toast.success('Removido!')
    }
  }

  async function adicionarPadroes() {
    const ano = new Date().getFullYear()
    const padroes = [
      { data: `${ano}-01-01`, nome: 'Confraternização Universal' },
      { data: `${ano}-04-21`, nome: 'Tiradentes' },
      { data: `${ano}-05-01`, nome: 'Dia do Trabalho' },
      { data: `${ano}-09-07`, nome: 'Independência' },
      { data: `${ano}-10-12`, nome: 'Nossa Senhora Aparecida' },
      { data: `${ano}-11-02`, nome: 'Finados' },
      { data: `${ano}-11-15`, nome: 'Proclamação da República' },
      { data: `${ano}-12-25`, nome: 'Natal' },
    ]

    const novos = [...feriados]
    padroes.forEach(p => {
      if (!novos.find(f => f.data === p.data)) {
        novos.push(p)
      }
    })
    novos.sort((a, b) => a.data.localeCompare(b.data))

    if (await salvar(novos)) {
      toast.success('Feriados nacionais adicionados!')
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/configuracoes" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-7 w-7" />
          Feriados
        </h1>
        <p className="text-muted-foreground mt-1">
          Feriados são considerados no cálculo de prazo de entrega
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Adicionar Feriado</h3>
              <form onSubmit={adicionar} className="space-y-3">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Natal"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </form>

              <div className="border-t pt-4">
                <Button variant="outline" size="sm" className="w-full" onClick={adicionarPadroes}>
                  + Adicionar feriados nacionais {new Date().getFullYear()}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Feriados cadastrados ({feriados.length})</h3>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : feriados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum feriado cadastrado
                </p>
              ) : (
                <div className="space-y-2">
                  {feriados.map(f => (
                    <div key={f.data} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{f.nome}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(f.data)}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => remover(f.data)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
