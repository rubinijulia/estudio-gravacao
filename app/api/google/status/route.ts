import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ connected: false })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('google_tokens')
    .select('email, created_at')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    connected: !!data,
    email: data?.email,
    connected_at: data?.created_at,
  })
}
