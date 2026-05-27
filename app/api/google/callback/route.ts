import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { exchangeCodeForTokens, getOAuth2Client } from '@/lib/google-calendar'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user_id
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${origin}/configuracoes/google-calendar?error=${error}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/configuracoes/google-calendar?error=missing_params`
    )
  }

  try {
    // Troca code por tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Tokens incompletos')
    }

    // Tenta pegar email do usuário Google (não bloqueia se falhar)
    let email: string | null = null
    try {
      const oauth2Client = getOAuth2Client()
      oauth2Client.setCredentials(tokens)
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const { data: userInfo } = await oauth2.userinfo.get()
      email = userInfo.email || null
    } catch (emailErr) {
      console.warn('Não foi possível obter email do Google:', emailErr)
    }

    // Salva tokens no banco (upsert)
    const admin = createAdminClient()
    const { error: dbError } = await admin
      .from('google_tokens')
      .upsert({
        user_id: state,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (dbError) {
      console.error('Erro ao salvar tokens:', dbError)
      return NextResponse.redirect(
        `${origin}/configuracoes/google-calendar?error=db_error`
      )
    }

    return NextResponse.redirect(
      `${origin}/configuracoes/google-calendar?success=true`
    )
  } catch (err: any) {
    console.error('Erro no callback Google:', err)
    return NextResponse.redirect(
      `${origin}/configuracoes/google-calendar?error=${encodeURIComponent(err.message)}`
    )
  }
}
