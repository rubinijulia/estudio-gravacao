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

    // Projetos em andamento (não finalizados e não atrasados)
    const { data: emAndamento } = await admin
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .neq('status', 'finalizado')
      .gte('data_entrega_prevista', hojeStr)
      .order('data_entrega_prevista')

    // Calcular data limite de 5 dias atrás (para cobrança)
    const cincoDiasAtras = new Date()
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5)
    const cincoDiasAtrasStr = dateToLocalString(cincoDiasAtras)

    // Pagamentos para revisar (gravação realizada mas ainda não pago)
    const { data: pagamentosRevisar } = await admin
      .from('vendas')
      .select('*, clientes(nome)')
      .eq('status_servico', 'realizada')
      .in('status_pagamento', ['a_receber', 'sinal_pago'])
      .order('data_venda')

    // 🚨 PAGAMENTOS PARA COBRAR: gravação há mais de 5 dias e não pago totalmente
    const { data: pagamentosCobrar } = await admin
      .from('vendas')
      .select('*, clientes(nome)')
      .eq('status_servico', 'realizada')
      .in('status_pagamento', ['a_receber', 'sinal_pago'])
      .lte('data_venda', cincoDiasAtrasStr)
      .order('data_venda')

    // NFs para emitir (todas pendentes que não foram canceladas)
    const { data: nfsParaEmitir } = await admin
      .from('vendas')
      .select('*, clientes(nome)')
      .eq('nf_emitida', false)
      .neq('status_pagamento', 'cancelado')
      .order('data_venda')

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

    // 🔍 CONFIRMAR PAGAMENTO (gravação > 5 dias sem baixa total)
    if (pagamentosCobrar && pagamentosCobrar.length > 0) {
      let totalConfirmar = 0
      mensagem += `🔍 *CONFIRMAR PAGAMENTO* (${pagamentosCobrar.length})\n`
      mensagem += `_Gravação há +5 dias sem baixa total no sistema - verificar se já recebemos_\n`
      pagamentosCobrar.forEach((v: any) => {
        const total = Number(v.valor_total) - Number(v.desconto || 0)
        const pago = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
        const pendente = total - pago
        totalConfirmar += pendente
        const dias = Math.floor((new Date().getTime() - new Date(v.data_venda + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
        mensagem += `• ${v.clientes?.nome} - R$ ${pendente.toFixed(2).replace('.', ',')} (${dias} dias)\n`
      })
      mensagem += `_Total a confirmar: R$ ${totalConfirmar.toFixed(2).replace('.', ',')}_\n\n`
    }

    // Pagamentos para revisar (geral, todos)
    if (pagamentosRevisar && pagamentosRevisar.length > 0) {
      let totalPendente = 0
      mensagem += `💰 *PAGAMENTOS PENDENTES* (${pagamentosRevisar.length})\n`
      mensagem += `_Gravações realizadas, aguardando recebimento_\n`
      pagamentosRevisar.forEach((v: any) => {
        const total = Number(v.valor_total) - Number(v.desconto || 0)
        const pago = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
        const pendente = total - pago
        totalPendente += pendente
        const statusLabel = v.status_pagamento === 'sinal_pago' ? '(sinal pago)' : '(a receber)'
        mensagem += `• ${v.clientes?.nome} - R$ ${pendente.toFixed(2).replace('.', ',')} ${statusLabel}\n`
      })
      mensagem += `_Total: R$ ${totalPendente.toFixed(2).replace('.', ',')}_\n\n`
    }

    // NFs para emitir
    if (nfsParaEmitir && nfsParaEmitir.length > 0) {
      let totalNf = 0
      mensagem += `📄 *NFs PARA EMITIR* (${nfsParaEmitir.length})\n`
      nfsParaEmitir.forEach((v: any) => {
        const valor = Number(v.valor_total) - Number(v.desconto || 0)
        totalNf += valor
        mensagem += `• ${v.clientes?.nome} - R$ ${valor.toFixed(2).replace('.', ',')}\n`
      })
      mensagem += `_Total: R$ ${totalNf.toFixed(2).replace('.', ',')}_\n\n`
    }

    // Projetos em andamento (agrupados por status)
    if (emAndamento && emAndamento.length > 0) {
      mensagem += `🎞️ *PROJETOS EM ANDAMENTO* (${emAndamento.length})\n`

      const statusLabels: Record<string, string> = {
        gravado: '📼 Gravado',
        editando: '✂️ Editando',
        cortes: '🎬 Cortes',
        enviado: '📤 Enviado',
        em_ajuste: '🔧 Em Ajuste',
      }

      const ordem = ['gravado', 'editando', 'cortes', 'enviado', 'em_ajuste']

      ordem.forEach(status => {
        const projetosStatus = emAndamento.filter((p: any) => p.status === status)
        if (projetosStatus.length === 0) return

        mensagem += `\n_${statusLabels[status]} (${projetosStatus.length})_\n`
        projetosStatus.forEach((p: any) => {
          const dataEntrega = new Date(p.data_entrega_prevista + 'T12:00:00')
          const dataFmt = dataEntrega.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          mensagem += `• ${p.clientes?.nome} - entrega ${dataFmt}`
          if (p.users_profile?.nome) mensagem += ` (${p.users_profile.nome})`
          mensagem += '\n'
        })
      })
      mensagem += '\n'
    }

    mensagem += `_Bom trabalho! 🚀_`

    return NextResponse.json({
      mensagem,
      total_gravacoes: gravacoes?.length || 0,
      total_entregas: entregas?.length || 0,
      total_atrasos: atrasados?.length || 0,
      total_em_andamento: emAndamento?.length || 0,
      total_pagamentos_revisar: pagamentosRevisar?.length || 0,
      total_pagamentos_cobrar: pagamentosCobrar?.length || 0,
      total_nfs_emitir: nfsParaEmitir?.length || 0,
    })
  } catch (err: any) {
    console.error('Erro ao gerar mensagem:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
