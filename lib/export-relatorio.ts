import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

/**
 * Remove emojis e caracteres unicode complexos que jsPDF não suporta
 */
function limparTexto(texto: string): string {
  if (!texto) return ''
  return String(texto)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
    .trim()
}

type DadosRelatorio = {
  competencia: string
  vendido: number
  recebido: number
  despesasFixas: number
  despesasVariaveis: number
  lucro: number
  vendas: any[]
  recebimentos: any[]
  custosFixos: any[]
  custosVariaveis: any[]
  projetosFinalizados?: any[]
  projetosAtrasados?: any[]
}

function nomeMes(competencia: string): string {
  return new Date(competencia + '-01').toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Exporta relatório em PDF
 */
export function exportarPDF(dados: DadosRelatorio) {
  const doc = new jsPDF()
  let y = 20

  // Cabeçalho
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Fechamento Mensal', 105, y, { align: 'center' })
  y += 7

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(nomeMes(dados.competencia), 105, y, { align: 'center' })
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(128)
  doc.text(`Gerado em ${formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 105, y, { align: 'center' })
  doc.setTextColor(0)
  y += 10

  // Resumo
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Financeiro', 14, y)
  y += 5

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Vendido', formatCurrency(dados.vendido)],
      ['Total Recebido', formatCurrency(dados.recebido)],
      ['Custos Fixos', formatCurrency(dados.despesasFixas)],
      ['Custos Variáveis', formatCurrency(dados.despesasVariaveis)],
      ['LUCRO REAL', formatCurrency(dados.lucro)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = dados.lucro >= 0 ? [219, 234, 254] : [254, 226, 226]
      }
    },
  })

  y = (doc as any).lastAutoTable.finalY + 15

  // Recebimentos
  if (dados.recebimentos.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Recebimentos do Mês', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Data', 'Cliente', 'Tipo', 'Forma', 'Valor']],
      body: dados.recebimentos.map((r: any) => [
        formatDate(r.data_recebimento),
        limparTexto(r.vendas?.clientes?.nome || '-'),
        r.tipo,
        r.forma_pagamento || '-',
        formatCurrency(r.valor),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 8 },
    })
    y = (doc as any).lastAutoTable.finalY + 15
  }

  // Custos Fixos
  if (dados.custosFixos.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Custos Fixos', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Nome', 'Categoria', 'Vencimento', 'Valor']],
      body: dados.custosFixos.map((c: any) => [
        limparTexto(c.nome),
        c.categoria,
        c.dia_vencimento ? `Dia ${c.dia_vencimento}` : '-',
        formatCurrency(c.valor),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 8 },
    })
    y = (doc as any).lastAutoTable.finalY + 15
  }

  // Custos Variáveis
  if (dados.custosVariaveis.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Custos Variáveis', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Descrição', 'Colaborador', 'Horas', 'Valor/h', 'Total']],
      body: dados.custosVariaveis.map((c: any) => [
        limparTexto(c.descricao),
        limparTexto(c.users_profile?.nome || '-'),
        c.horas_trabalhadas || '-',
        c.valor_hora ? formatCurrency(c.valor_hora) : '-',
        formatCurrency(c.valor_total),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 8 },
    })
    y = (doc as any).lastAutoTable.finalY + 15
  }

  // Vendas
  if (dados.vendas.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Vendas do Mês', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Data', 'Cliente', 'Pagamento', 'Serviço', 'Valor']],
      body: dados.vendas.map((v: any) => [
        formatDate(v.data_venda),
        limparTexto(v.clientes?.nome || '-'),
        v.status_pagamento,
        v.status_servico,
        formatCurrency(Number(v.valor_total) - Number(v.desconto || 0)),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      styles: { fontSize: 8 },
    })
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(
      `Página ${i} de ${totalPages}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
    doc.text(
      'Estúdio de Gravação - Sistema de Gestão',
      14,
      doc.internal.pageSize.height - 10
    )
  }

  doc.save(`fechamento-${dados.competencia}.pdf`)
}

/**
 * Exporta relatório em CSV (Excel)
 */
export function exportarCSV(dados: DadosRelatorio) {
  const linhas: string[] = []

  // Cabeçalho
  linhas.push(`Fechamento Mensal - ${nomeMes(dados.competencia)}`)
  linhas.push(`Gerado em: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}`)
  linhas.push('')

  // Resumo
  linhas.push('RESUMO FINANCEIRO')
  linhas.push('Indicador;Valor')
  linhas.push(`Total Vendido;${dados.vendido.toFixed(2)}`)
  linhas.push(`Total Recebido;${dados.recebido.toFixed(2)}`)
  linhas.push(`Custos Fixos;${dados.despesasFixas.toFixed(2)}`)
  linhas.push(`Custos Variaveis;${dados.despesasVariaveis.toFixed(2)}`)
  linhas.push(`LUCRO REAL;${dados.lucro.toFixed(2)}`)
  linhas.push('')

  // Recebimentos
  if (dados.recebimentos.length > 0) {
    linhas.push('RECEBIMENTOS')
    linhas.push('Data;Cliente;Tipo;Forma;Valor')
    dados.recebimentos.forEach((r: any) => {
      linhas.push([
        formatDate(r.data_recebimento),
        r.vendas?.clientes?.nome || '',
        r.tipo,
        r.forma_pagamento || '',
        Number(r.valor).toFixed(2),
      ].join(';'))
    })
    linhas.push('')
  }

  // Custos Fixos
  if (dados.custosFixos.length > 0) {
    linhas.push('CUSTOS FIXOS')
    linhas.push('Nome;Categoria;Vencimento;Valor')
    dados.custosFixos.forEach((c: any) => {
      linhas.push([
        c.nome,
        c.categoria,
        c.dia_vencimento || '',
        Number(c.valor).toFixed(2),
      ].join(';'))
    })
    linhas.push('')
  }

  // Custos Variáveis
  if (dados.custosVariaveis.length > 0) {
    linhas.push('CUSTOS VARIAVEIS')
    linhas.push('Descricao;Colaborador;Horas;Valor/h;Total')
    dados.custosVariaveis.forEach((c: any) => {
      linhas.push([
        c.descricao,
        c.users_profile?.nome || '',
        c.horas_trabalhadas || '',
        c.valor_hora ? Number(c.valor_hora).toFixed(2) : '',
        Number(c.valor_total).toFixed(2),
      ].join(';'))
    })
    linhas.push('')
  }

  // Vendas
  if (dados.vendas.length > 0) {
    linhas.push('VENDAS')
    linhas.push('Data;Cliente;Status Pagamento;Status Servico;Valor')
    dados.vendas.forEach((v: any) => {
      linhas.push([
        formatDate(v.data_venda),
        v.clientes?.nome || '',
        v.status_pagamento,
        v.status_servico,
        (Number(v.valor_total) - Number(v.desconto || 0)).toFixed(2),
      ].join(';'))
    })
  }

  // Download com BOM para Excel reconhecer UTF-8
  const csv = '﻿' + linhas.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `fechamento-${dados.competencia}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
