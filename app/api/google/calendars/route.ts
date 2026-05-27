import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { listCalendars } from '@/lib/google-calendar'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const calendars = await listCalendars(user.id)
    const formatted = calendars.map(c => ({
      id: c.id,
      summary: c.summary,
      description: c.description,
      backgroundColor: c.backgroundColor,
      primary: c.primary,
      accessRole: c.accessRole,
    }))
    return NextResponse.json({ calendars: formatted })
  } catch (err: any) {
    console.error('Erro ao listar calendários:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
