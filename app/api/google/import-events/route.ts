import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAuthenticatedClient } from '@/lib/google-calendar'
import { google } from 'googleapis'

/**
 * Lista eventos futuros dos calendários vinculados aos estúdios
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    // Busca todos os estúdios com calendário vinculado
    const admin = createAdminClient()
    const { data: estudios } = await admin
      .from('estudios')
      .select('id, nome, google_calendar_id')
      .eq('ativo', true)
      .not('google_calendar_id', 'is', null)

    if (!estudios || estudios.length === 0) {
      return NextResponse.json({
        error: 'Nenhum estúdio com calendário Google vinculado',
        events: []
      })
    }

    const auth = await getAuthenticatedClient(user.id)
    const calendar = google.calendar({ version: 'v3', auth })

    const allEvents: any[] = []
    const now = new Date().toISOString()
    const oneYearLater = new Date()
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

    // Busca eventos futuros de cada calendário
    for (const estudio of estudios) {
      try {
        const response = await calendar.events.list({
          calendarId: estudio.google_calendar_id!,
          timeMin: now,
          timeMax: oneYearLater.toISOString(),
          maxResults: 250,
          singleEvents: true,
          orderBy: 'startTime',
        })

        const events = (response.data.items || []).map(e => ({
          google_event_id: e.id,
          google_calendar_id: estudio.google_calendar_id,
          estudio_id: estudio.id,
          estudio_nome: estudio.nome,
          titulo: e.summary || 'Sem título',
          descricao: e.description || '',
          location: e.location || '',
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          html_link: e.htmlLink,
        }))

        allEvents.push(...events)
      } catch (err) {
        console.error(`Erro ao buscar eventos do estúdio ${estudio.nome}:`, err)
      }
    }

    // Filtra eventos que JÁ EXISTEM no sistema (não duplicar)
    const eventIds = allEvents.map(e => e.google_event_id).filter(Boolean)
    if (eventIds.length > 0) {
      const { data: existing } = await admin
        .from('agendamentos')
        .select('google_event_id')
        .in('google_event_id', eventIds as string[])

      const existingIds = new Set((existing || []).map(e => e.google_event_id))
      const novosEventos = allEvents.filter(e => !existingIds.has(e.google_event_id))

      return NextResponse.json({
        total: allEvents.length,
        novos: novosEventos.length,
        ja_importados: allEvents.length - novosEventos.length,
        events: novosEventos,
      })
    }

    return NextResponse.json({
      total: allEvents.length,
      novos: allEvents.length,
      ja_importados: 0,
      events: allEvents,
    })
  } catch (err: any) {
    console.error('Erro ao listar eventos Google:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Importa eventos selecionados como agendamentos
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { events } = body

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Nenhum evento para importar' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Busca todos os clientes para tentar vincular automaticamente por nome
    const { data: clientes } = await admin
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)

    let importados = 0
    let erros = 0

    for (const evt of events) {
      try {
        if (!evt.start || !evt.end) continue

        const startDate = new Date(evt.start)
        const endDate = new Date(evt.end)

        // Tenta vincular cliente pelo título (busca por nome dos clientes existentes)
        let cliente_id = evt.cliente_id || null
        if (!cliente_id && clientes) {
          const tituloLower = (evt.titulo || '').toLowerCase()
          const clienteMatch = clientes.find(c =>
            tituloLower.includes(c.nome.toLowerCase())
          )
          if (clienteMatch) cliente_id = clienteMatch.id
        }

        // Se não tem cliente vinculado, cria um cliente placeholder
        if (!cliente_id) {
          const { data: novoCliente } = await admin
            .from('clientes')
            .insert({
              nome: evt.titulo || 'Cliente do Google Calendar',
              cadastro_completo: false,
              observacoes: 'Cliente criado automaticamente ao importar do Google Calendar',
            })
            .select()
            .single()

          if (novoCliente) cliente_id = novoCliente.id
        }

        if (!cliente_id) continue

        // Formato YYYY-MM-DD pra data
        const data = startDate.toISOString().split('T')[0]
        // Formato HH:MM pra hora
        const hora_inicio = startDate.toTimeString().substring(0, 5)
        const hora_fim = endDate.toTimeString().substring(0, 5)

        await admin.from('agendamentos').insert({
          cliente_id,
          titulo: evt.titulo,
          data,
          hora_inicio,
          hora_fim,
          estudio_id: evt.estudio_id,
          estudio: evt.estudio_nome,
          tipo: 'gravacao',
          observacoes: evt.descricao || null,
          google_event_id: evt.google_event_id,
          google_calendar_id: evt.google_calendar_id,
        })

        importados++
      } catch (err) {
        console.error('Erro ao importar evento:', evt, err)
        erros++
      }
    }

    return NextResponse.json({
      importados,
      erros,
      total: events.length,
    })
  } catch (err: any) {
    console.error('Erro ao importar eventos:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
