'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * Hook que escuta mudanças em uma tabela do Supabase em tempo real
 * e executa um callback (geralmente recarregar os dados)
 *
 * @example
 * useRealtime('agendamentos', () => loadAgendamentos())
 */
export function useRealtime(
  table: string,
  callback: () => void,
  options?: {
    /** Se true, só escuta INSERT (não UPDATE/DELETE). Default: false (escuta todos) */
    onlyInsert?: boolean
    /** Filtro opcional (ex: 'cliente_id=eq.xxx') */
    filter?: string
  }
) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes' as any,
        {
          event: options?.onlyInsert ? 'INSERT' : '*',
          schema: 'public',
          table,
          ...(options?.filter ? { filter: options.filter } : {}),
        },
        (payload: any) => {
          console.log(`[Realtime] ${table}:`, payload.eventType)
          callback()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])
}
