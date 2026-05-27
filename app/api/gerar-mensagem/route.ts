import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { dateToLocalString } from '@/lib/formatters'

/**
 * Gera mensagem formatada para WhatsApp com agenda do dia selecionado
 * Acesso só para admin (via session)
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verifica se é admin
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })
  }

  const dataParam = request.nextUrl.searchParams.get('data') // YYYY-MM-DD

  if (!dataParam) {
    return NextResponse.json({ error: 'Parâmetro "data" obrigatório (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    // Gravações do dia
    const { data: gravacoes } = await admin
      .from('agendamentos')
      .select('*, clientes(nome)')
      .eq('data', dataParam)
      .order('hora_inicio')

    // Entregas do dia
    const { data: entregas } = await admin
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .eq('data_entrega_prevista', dataParam)
      .neq('status', 'finalizado')

    // Projetos atrasados (sempre relevante)
    const hojeStr = dateToLocalString(new Date())
    const { data: atrasados } = await admin
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .lt('data_entrega_prevista', hojeStr)
      .neq('status', 'finalizado')
      .order('data_entrega_prevista')

    // Formatar mensagem
    const dataObj = new Date(dataParam + 'T12:00:00')
    const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' })
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    })

    const ehAmanha = dataParam > hojeStr
    const ehHoje = dataParam === hojeStr
    const saudacao = ehAmanha
      ? `🌙 *Boa noite, equipe!*\n\n📅 *Resumo de amanhã - ${diaSemana}, ${dataFormatada}*`
      : ehHoje
      ? `☀️ *Bom dia, equipe!*\n\n📅 *Resumo de hoje - ${diaSemana}, ${dataFormatada}*`
      : `📅 *Resumo - ${diaSemana}, ${dataFormatada}*`

    let mensagem = `${saudacao}\n\n`

    // Gravações
    if (!gravacoes || gravacoes.length === 0) {
      mensagem += `🎬 *GRAVAÇÕES*: Nenhuma agendada\n\n`
    } else {
      mensagem += `🎬 *GRAVAÇÕES* (${gravacoes.length})\n`
      gravacoes.forEach((g: any) => {
        const hora = g.hora_inicio?.substring(0, 5)
        const horaFim = g.hora_fim?.substring(0, 5)
        mensagem += `• ${hora}-${horaFim} | ${g.clientes?.nome || g.titulo}`
        if (g.estudio) mensagem += ` | ${g.estudio}`
        mensagem += '\n'
      })
      mensagem += '\n'
    }

    // Entregas
    if (entregas && entregas.length > 0) {
      mensagem += `📦 *ENTREGAS DO DIA* (${entregas.length})\n`
      entregas.forEach((e: any) => {
        mensagem += `• ${e.clientes?.nome} - ${e.titulo}`
        if (e.users_profile?.nome) mensagem += ` (${e.users_profile.nome})`
        mensagem += '\n'
      })
      mensagem += '\n'
    }

    // Atrasos
    if (atrasados && atrasados.length > 0) {
      mensagem += `🚨 *PROJETOS ATRASADOS* (${atrasados.length})\n`
      atrasados.forEach((p: any) => {
        const diasAtraso = Math.floor(
          (new Date().getTime() - new Date(p.data_entrega_prevista).getTime()) / (1000 * 60 * 60 * 24)
        )
        mensagem += `• ${p.clientes?.nome} - ${diasAtraso}d de atraso`
        if (p.users_profile?.nome) mensagem += ` (${p.users_profile.nome})`
        mensagem += '\n'
      })
      mensagem += '\n'
    }

    mensagem += `_Bom trabalho! 🚀_`

    return NextResponse.json({
      mensagem,
      total_gravacoes: gravacoes?.length || 0,
      total_entregas: entregas?.length || 0,
      total_atrasos: atrasados?.length || 0,
    })
  } catch (err: any) {
    console.error('Erro ao gerar mensagem:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
