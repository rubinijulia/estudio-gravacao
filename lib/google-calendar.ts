import { google } from 'googleapis'
import { createAdminClient } from './supabase-admin'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
]

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export function getAuthUrl(state: string) {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Retorna cliente OAuth autenticado para o usuário,
 * fazendo refresh do token se necessário
 */
export async function getAuthenticatedClient(userId: string) {
  const admin = createAdminClient()

  const { data: tokenData, error } = await admin
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData) {
    throw new Error('Usuário não tem conexão com Google Calendar')
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : null,
  })

  // Se token expirou, faz refresh
  const isExpired = tokenData.expires_at && new Date(tokenData.expires_at) <= new Date()
  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken()

    await admin
      .from('google_tokens')
      .update({
        access_token: credentials.access_token!,
        expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      })
      .eq('user_id', userId)

    oauth2Client.setCredentials(credentials)
  }

  return oauth2Client
}

/**
 * Lista calendários do usuário
 */
export async function listCalendars(userId: string) {
  const auth = await getAuthenticatedClient(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.calendarList.list()
  return response.data.items || []
}

type EventData = {
  summary: string
  description?: string
  startDateTime: string // ISO
  endDateTime: string // ISO
  timezone?: string
  location?: string
  calendarId?: string // Se não passar, usa 'primary'
}

/**
 * Cria evento no Google Calendar
 */
export async function createEvent(userId: string, data: EventData) {
  const auth = await getAuthenticatedClient(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  const event = await calendar.events.insert({
    calendarId: data.calendarId || 'primary',
    requestBody: {
      summary: data.summary,
      description: data.description,
      location: data.location,
      start: {
        dateTime: data.startDateTime,
        timeZone: data.timezone || 'America/Sao_Paulo',
      },
      end: {
        dateTime: data.endDateTime,
        timeZone: data.timezone || 'America/Sao_Paulo',
      },
    },
  })

  return {
    eventId: event.data.id,
    calendarId: data.calendarId || 'primary',
    htmlLink: event.data.htmlLink,
  }
}

/**
 * Atualiza evento no Google Calendar
 */
export async function updateEvent(
  userId: string,
  eventId: string,
  calendarId: string,
  data: Partial<EventData>
) {
  const auth = await getAuthenticatedClient(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  const requestBody: any = {}
  if (data.summary !== undefined) requestBody.summary = data.summary
  if (data.description !== undefined) requestBody.description = data.description
  if (data.location !== undefined) requestBody.location = data.location
  if (data.startDateTime) {
    requestBody.start = {
      dateTime: data.startDateTime,
      timeZone: data.timezone || 'America/Sao_Paulo',
    }
  }
  if (data.endDateTime) {
    requestBody.end = {
      dateTime: data.endDateTime,
      timeZone: data.timezone || 'America/Sao_Paulo',
    }
  }

  const event = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody,
  })

  return event.data
}

/**
 * Deleta evento do Google Calendar
 */
export async function deleteEvent(userId: string, eventId: string, calendarId: string) {
  const auth = await getAuthenticatedClient(userId)
  const calendar = google.calendar({ version: 'v3', auth })

  await calendar.events.delete({ calendarId, eventId })
}

/**
 * Verifica se usuário tem conexão Google ativa
 */
export async function hasGoogleConnection(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('google_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .single()
  return !!data
}
