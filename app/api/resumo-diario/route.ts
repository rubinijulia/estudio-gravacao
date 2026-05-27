import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getTodayLocal, dateToLocalString } from '@/lib/formatters'

/**
 * Endpoint que retorna o resumo diário do estúdio
 * Usado por integrações externas (Cowork, n8n, Zapier) para enviar mensagem no WhatsApp
 *
 * Auth: Bearer token via Authorization header ou ?key= query param
 *
 * Exemplos:
 *   GET /api/resumo-diario?key=SUA_API_KEY
 *   GET /api/resumo-diario?key=SUA_API_KEY&formato=texto
 *   GET /api/resumo-diario  (com Authorization: Bearer SUA_API_KEY)
 */
export async function GET(request: NextRequest) {
  // Autenticação via API key
  const authHeader = request.headers.get('authorization')
  const queryKey = request.nextUrl.searchParams.get('key')
  const apiKey = authHeader?.replace('Bearer ', '') || queryKey

  if (!apiKey || apiKey !== process.env.API_RESUMO_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formato = request.nextUrl.searchParams.get('formato') || 'json'

  try {
    const admin = createAdminClient()
    const hoje = getTodayLocal()
    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = dateToLocalString(inicioMes)

    // Gravações de hoje
    const { data: gravacoes } = await admin
      .from('agendamentos')
      .select('*, clientes(nome)')
      .eq('data', hoje)
      .order('hora_inicio')

    // Entregas de hoje
    const { data: entregas } = await admin
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .eq('data_entrega_prevista', hoje)
      .neq('status', 'finalizado')

    // Projetos atrasados
    const { data: atrasados } = await admin
      .from('projetos')
      .select('*, clientes(nome), users_profile!projetos_responsavel_id_fkey(nome)')
      .lt('data_entrega_prevista', hoje)
      .neq('status', 'finalizado')
      .order('data_entrega_prevista')

    // Vendas em atraso de pagamento (com data de venda > 30 dias e ainda 'a_receber')
    const trintaDiasAtras = new Date()
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
    const { data: pagamentosAtrasados } = await admin
      .from('vendas')
      .select('*, clientes(nome)')
      .in('status_pagamento', ['a_receber', 'sinal_pago'])
      .lt('data_venda', dateToLocalString(trintaDiasAtras))

    // Resumo financeiro do mês
    const { data: vendasMes } = await admin
      .from('vendas')
      .select('valor_total, desconto, status_pagamento, valor_sinal')
      .gte('data_venda', inicioMesStr)
      .neq('status_pagamento', 'cancelado')

    const vendido = (vendasMes || []).reduce(
      (s, v) => s + (Number(v.valor_total) - Number(v.desconto || 0)),
      0
    )
    const recebido =
      (vendasMes || [])
        .filter(v => v.status_pagamento === 'totalmente_recebido')
        .reduce((s, v) => s + (Number(v.valor_total) - Number(v.desconto || 0)), 0) +
      (vendasMes || [])
        .filter(v => v.status_pagamento === 'sinal_pago')
        .reduce((s, v) => s + Number(v.valor_sinal || 0), 0)

    // Meta do mês
    const { data: meta } = await admin
      .from('metas')
      .select('meta_vendas')
      .eq('competencia', inicioMesStr)
      .single()

    const metaValor = meta?.meta_vendas || 0
    const percentualMeta = metaValor > 0 ? Math.round((vendido / metaValor) * 100) : 0

    // Dados estruturados
    const resumo = {
      data: hoje,
      timestamp: new Date().toISOString(),
      gravacoes_hoje: (gravacoes || []).map((g: any) => ({
        hora: g.hora_inicio?.substring(0, 5),
        cliente: g.clientes?.nome,
        titulo: g.titulo,
        estudio: g.estudio,
        ja_gravado: g.gravacao_realizada,
      })),
      entregas_hoje: (entregas || []).map((p: any) => ({
        cliente: p.clientes?.nome,
        titulo: p.titulo,
        formato: p.formato,
        responsavel: p.users_profile?.nome,
        status: p.status,
      })),
      projetos_atrasados: (atrasados || []).map((p: any) => {
        const diasAtraso = Math.floor(
          (new Date().getTime() - new Date(p.data_entrega_prevista).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        return {
          cliente: p.clientes?.nome,
          titulo: p.titulo,
          dias_atraso: diasAtraso,
          status: p.status,
          responsavel: p.users_profile?.nome,
        }
      }),
      pagamentos_atrasados: (pagamentosAtrasados || []).map((v: any) => {
        const total = Number(v.valor_total) - Number(v.desconto || 0)
        const pago = v.status_pagamento === 'sinal_pago' ? Number(v.valor_sinal || 0) : 0
        const aReceber = total - pago
        const diasAtraso = Math.floor(
          (new Date().getTime() - new Date(v.data_venda).getTime()) /
            (1000 * 60 * 60 * 24)
        )
        return {
          cliente: v.clientes?.nome,
          valor_pendente: aReceber,
          dias_desde_venda: diasAtraso,
        }
      }),
      financeiro_mes: {
        vendido,
        recebido,
        meta: metaValor,
        percentual_meta: percentualMeta,
      },
      contadores: {
        gravacoes_hoje: gravacoes?.length || 0,
        entregas_hoje: entregas?.length || 0,
        projetos_atrasados: atrasados?.length || 0,
        pagamentos_atrasados: pagamentosAtrasados?.length || 0,
      },
    }

    // Formato texto (mensagem WhatsApp pronta)
    if (formato === 'texto') {
      const mensagem = formatarMensagemWhatsApp(resumo)
      return new NextResponse(mensagem, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    return NextResponse.json(resumo)
  } catch (err: any) {
    console.error('Erro no resumo diário:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function formatarMensagemWhatsApp(resumo: any): string {
  const dataHoje = new Date(resumo.data).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  let msg = `☀️ *Bom dia! Resumo de ${dataHoje}*\n\n`

  // Gravações
  if (resumo.gravacoes_hoje.length === 0) {
    msg += `🎬 *GRAVAÇÕES HOJE*: Nenhuma\n\n`
  } else {
    msg += `🎬 *GRAVAÇÕES HOJE* (${resumo.gravacoes_hoje.length})\n`
    resumo.gravacoes_hoje.forEach((g: any) => {
      const status = g.ja_gravado ? '✅' : '⏰'
      msg += `${status} ${g.hora} - ${g.cliente}`
      if (g.estudio) msg += ` (${g.estudio})`
      msg += '\n'
    })
    msg += '\n'
  }

  // Entregas
  if (resumo.entregas_hoje.length > 0) {
    msg += `📦 *ENTREGAS HOJE* (${resumo.entregas_hoje.length})\n`
    resumo.entregas_hoje.forEach((e: any) => {
      msg += `• ${e.cliente} - ${e.titulo}`
      if (e.responsavel) msg += ` (${e.responsavel})`
      msg += '\n'
    })
    msg += '\n'
  }

  // Projetos atrasados
  if (resumo.projetos_atrasados.length > 0) {
    msg += `🚨 *PROJETOS ATRASADOS* (${resumo.projetos_atrasados.length})\n`
    resumo.projetos_atrasados.forEach((p: any) => {
      msg += `⚠️ ${p.cliente} - ${p.dias_atraso}d de atraso\n`
    })
    msg += '\n'
  }

  // Pagamentos atrasados
  if (resumo.pagamentos_atrasados.length > 0) {
    const totalPendente = resumo.pagamentos_atrasados.reduce(
      (s: number, p: any) => s + p.valor_pendente,
      0
    )
    msg += `💸 *PAGAMENTOS PENDENTES* (>30 dias)\n`
    msg += `Total: R$ ${totalPendente.toFixed(2)}\n`
    resumo.pagamentos_atrasados.forEach((p: any) => {
      msg += `• ${p.cliente}: R$ ${p.valor_pendente.toFixed(2)}\n`
    })
    msg += '\n'
  }

  // Financeiro do mês
  const fin = resumo.financeiro_mes
  msg += `💰 *MÊS ATUAL*\n`
  msg += `Vendido: R$ ${fin.vendido.toFixed(2)}\n`
  msg += `Recebido: R$ ${fin.recebido.toFixed(2)}\n`
  if (fin.meta > 0) {
    msg += `Meta: R$ ${fin.meta.toFixed(2)} (${fin.percentual_meta}%)\n`
  }

  msg += `\n_Bom dia e bom trabalho! 🚀_`

  return msg
}
