'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  agendamentos: any[]
  mesAtual: Date
  onMudarMes: (novoMes: Date) => void
  onClickDia?: (data: string) => void
  onClickAgendamento?: (ag: any) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function CalendarioView({ agendamentos, mesAtual, onMudarMes, onClickDia, onClickAgendamento }: Props) {
  const year = mesAtual.getFullYear()
  const month = mesAtual.getMonth()

  // Calcula os dias do calendário (com dias do mês anterior/próximo pra completar a semana)
  const dias = useMemo(() => {
    const primeiroDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const diaSemanaInicio = primeiroDia.getDay() // 0 = domingo

    const result: { date: Date; doMesAtual: boolean }[] = []

    // Dias do mês anterior (pra preencher início)
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      result.push({ date, doMesAtual: false })
    }

    // Dias do mês atual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      const date = new Date(year, month, i)
      result.push({ date, doMesAtual: true })
    }

    // Dias do próximo mês (pra completar a última semana - 6 semanas total = 42 dias)
    const restantes = 42 - result.length
    for (let i = 1; i <= restantes; i++) {
      const date = new Date(year, month + 1, i)
      result.push({ date, doMesAtual: false })
    }

    return result
  }, [year, month])

  function getAgendamentosDoDia(date: Date): any[] {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return agendamentos.filter(ag => ag.data === dateStr)
  }

  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  return (
    <div className="space-y-4">
      {/* Header do calendário */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold capitalize">
          {MESES[month]} {year}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMudarMes(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMudarMes(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMudarMes(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map(dia => (
          <div key={dia} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia, idx) => {
          const ags = getAgendamentosDoDia(dia.date)
          const dateStr = `${dia.date.getFullYear()}-${String(dia.date.getMonth() + 1).padStart(2, '0')}-${String(dia.date.getDate()).padStart(2, '0')}`
          const isHoje = dateStr === hojeStr
          const isFimSemana = dia.date.getDay() === 0 || dia.date.getDay() === 6

          return (
            <div
              key={idx}
              onClick={() => onClickDia?.(dateStr)}
              className={cn(
                'border rounded-lg p-2 min-h-[100px] cursor-pointer transition-colors',
                dia.doMesAtual ? 'bg-white hover:bg-muted/50' : 'bg-muted/30 opacity-50',
                isHoje && 'ring-2 ring-blue-500 bg-blue-50',
                isFimSemana && dia.doMesAtual && 'bg-slate-50'
              )}
            >
              <div className={cn(
                'text-sm font-semibold mb-1',
                isHoje && 'text-blue-700'
              )}>
                {dia.date.getDate()}
              </div>
              <div className="space-y-1">
                {ags.slice(0, 3).map(ag => (
                  <div
                    key={ag.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onClickAgendamento?.(ag)
                    }}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80',
                      ag.gravacao_realizada
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-500 text-white'
                    )}
                    title={`${ag.hora_inicio?.substring(0, 5)} - ${ag.titulo}`}
                  >
                    {ag.gravacao_realizada && <Check className="inline h-2.5 w-2.5 mr-0.5" />}
                    {ag.hora_inicio?.substring(0, 5)} {ag.clientes?.nome || ag.titulo}
                  </div>
                ))}
                {ags.length > 3 && (
                  <div className="text-[10px] text-muted-foreground font-semibold pl-1">
                    +{ags.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded" /> A gravar
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-600 rounded" /> Gravado
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-blue-500 rounded" /> Hoje
        </div>
      </div>
    </div>
  )
}
