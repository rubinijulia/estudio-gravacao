import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Cria novo usuário
export async function POST(request: NextRequest) {
  try {
    // Verifica se o usuário atual é admin
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin pode criar usuários' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, nome, role, valor_hora } = body

    if (!email || !password || !nome || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Cria usuário no Auth
    const { data: newUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Cria perfil
    const { error: profileError } = await admin
      .from('users_profile')
      .insert({
        id: newUser.user.id,
        nome,
        role,
        ativo: true,
        valor_hora: valor_hora ? Number(valor_hora) : null,
      })

    if (profileError) {
      // Rollback: deletar usuário do auth
      await admin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: newUser.user.id })
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Atualizar usuário
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nome, role, valor_hora, ativo, password } = body

    const admin = createAdminClient()

    // Atualiza perfil
    const updates: any = {}
    if (nome !== undefined) updates.nome = nome
    if (role !== undefined) updates.role = role
    if (valor_hora !== undefined) updates.valor_hora = valor_hora ? Number(valor_hora) : null
    if (ativo !== undefined) updates.ativo = ativo

    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from('users_profile').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Se mudou senha
    if (password) {
      const { error } = await admin.auth.admin.updateUserById(id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Deletar usuário
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

    if (id === user.id) {
      return NextResponse.json({ error: 'Você não pode deletar seu próprio usuário' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
