import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createEvent, updateEvent, deleteEvent, hasGoogleConnection } from '@/lib/google-calendar'

/**
 * Sincroniza um agendamento com Google Calendar
 * Body: { agendamento_id, action: 'create' | 'update' | 'delete' }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { agendamento_id, action } = body

  if (!agendamento_id || !action) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Busca o admin que tem conexão Google (assumindo 1 conexão por estúdio - o admin)
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()

  let googleUserId = user.id
  if (profile?.role !== 'admin') {
    // Editor/operacional usa a conexão do admin
    const { data: anyAdmin } = await admin
      .from('users_profile')
      .select('id')
      .eq('role', 'admin')
      .eq('ativo', true)
      .limit(1)
      .single()
    if (anyAdmin) googleUserId = anyAdmin.id
  }

  // Verifica se admin tem conexão
  const connected = await hasGoogleConnection(googleUserId)
  if (!connected) {
    return NextResponse.json({
      synced: false,
      error: 'Sem conexão Google Calendar'
    })
  }

  try {
    if (action === 'delete') {
      // Buscar agendamento para pegar google_event_id
      const { data: ag } = await admin
        .from('agendamentos')
        .select('google_event_id, google_calendar_id')
        .eq('id', agendamento_id)
        .single()

      if (ag?.google_event_id && ag?.google_calendar_id) {
        await deleteEvent(googleUserId, ag.google_event_id, ag.google_calendar_id)
      }
      return NextResponse.json({ synced: true })
    }

    // Buscar agendamento + cliente + estudio
    const { data: ag } = await admin
      .from('agendamentos')
      .select('*, clientes(nome), estudios:estudio_id(google_calendar_id)')
      .eq('id', agendamento_id)
      .single()

    if (!ag) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const startDateTime = `${ag.data}T${ag.hora_inicio}-03:00`
    const endDateTime = `${ag.data}T${ag.hora_fim}-03:00`

    const eventData = {
      summary: `${ag.titulo} - ${(ag as any).clientes?.nome || ''}`,
      description: ag.observacoes || '',
      startDateTime,
      endDateTime,
      location: ag.estudio || '',
      calendarId: (ag as any).estudios?.google_calendar_id || 'primary',
    }

    if (action === 'create' || !ag.google_event_id) {
      const result = await createEvent(googleUserId, eventData)
      await admin
        .from('agendamentos')
        .update({
          google_event_id: result.eventId,
          google_calendar_id: result.calendarId,
        })
        .eq('id', agendamento_id)
      return NextResponse.json({ synced: true, eventId: result.eventId })
    }

    if (action === 'update' && ag.google_event_id) {
      // Se mudou o calendário, deleta o antigo e cria no novo
      const novoCalendarId = (ag as any).estudios?.google_calendar_id || 'primary'
      if (ag.google_calendar_id !== novoCalendarId) {
        try {
          await deleteEvent(googleUserId, ag.google_event_id, ag.google_calendar_id!)
        } catch (e) {
          console.warn('Erro ao deletar evento antigo:', e)
        }
        const result = await createEvent(googleUserId, eventData)
        await admin
          .from('agendamentos')
          .update({
            google_event_id: result.eventId,
            google_calendar_id: result.calendarId,
          })
          .eq('id', agendamento_id)
        return NextResponse.json({ synced: true, eventId: result.eventId })
      }

      await updateEvent(googleUserId, ag.google_event_id, ag.google_calendar_id!, eventData)
      return NextResponse.json({ synced: true })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    console.error('Erro na sincronização:', err)
    return NextResponse.json({
      synced: false,
      error: err.message,
    }, { status: 500 })
  }
}
