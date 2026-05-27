import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './formatters'

/**
 * Remove emojis e caracteres unicode complexos que jsPDF não suporta
 */
function limparTexto(texto: string): string {
  if (!texto) return ''
  return String(texto)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // símbolos & pictografias
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transporte & mapas
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // bandeiras
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // símbolos diversos
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // símbolos suplementares
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // mais símbolos
    .trim()
}

type DadosRelatorioGeral = {
  periodoInicio: string
  periodoFim: string
  vendasMes: any[]
  topClientes: any[]
  projetosStatus: any[]
  performanceEquipe: any[]
  conversao: {
    em_curso: number
    realizada: number
    cancelada: number
    taxa: number
  }
  totalVendido: number
  totalRecebido: number
}

const STATUS_LABEL: Record<string, string> = {
  gravado: 'Gravado',
  editando: 'Editando',
  cortes: 'Cortes',
  enviado: 'Enviado',
  em_ajuste: 'Em Ajuste',
  finalizado: 'Finalizado',
}

export function exportarRelatorioGeralPDF(dados: DadosRelatorioGeral) {
  const doc = new jsPDF()
  let y = 20

  // Cabeçalho
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Geral', 105, y, { align: 'center' })
  y += 7

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Período: ${formatDate(dados.periodoInicio)} a ${formatDate(dados.periodoFim)}`,
    105,
    y,
    { align: 'center' }
  )
  y += 5

  doc.setFontSize(9)
  doc.setTextColor(128)
  doc.text(`Gerado em ${formatDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 105, y, { align: 'center' })
  doc.setTextColor(0)
  y += 12

  // Indicadores chave
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicadores Chave', 14, y)
  y += 3

  autoTable(doc, {
    startY: y + 3,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Vendido', formatCurrency(dados.totalVendido)],
      ['Total Recebido', formatCurrency(dados.totalRecebido)],
      ['Taxa de Conversão', `${dados.conversao.taxa}%`],
      ['Vendas Realizadas', String(dados.conversao.realizada)],
      ['Vendas Canceladas', String(dados.conversao.cancelada)],
      ['Vendas em Curso', String(dados.conversao.em_curso)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
  })

  y = (doc as any).lastAutoTable.finalY + 12

  // Vendas por mês
  if (dados.vendasMes.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Vendas por Mes', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Mês', 'Vendido', 'Recebido', 'Qtd Vendas']],
      body: dados.vendasMes.map((m: any) => [
        m.mes,
        formatCurrency(m.vendido),
        formatCurrency(m.recebido),
        String(m.count),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  // Top Clientes
  if (dados.topClientes.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Top 10 Clientes', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['#', 'Cliente', 'Vendas', 'Total']],
      body: dados.topClientes.map((c: any, i: number) => [
        String(i + 1),
        limparTexto(c.nome),
        String(c.count),
        formatCurrency(c.total),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  // Projetos por status
  if (dados.projetosStatus.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Projetos por Status', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Status', 'Quantidade']],
      body: dados.projetosStatus.map((p: any) => [
        STATUS_LABEL[p.name] || p.name,
        String(p.value),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  // Performance equipe
  if (dados.performanceEquipe.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Performance da Equipe', 14, y)
    y += 3

    autoTable(doc, {
      startY: y + 3,
      head: [['Editor', 'Total', 'Finalizados', 'No Prazo', 'Atrasados']],
      body: dados.performanceEquipe.map((p: any) => [
        limparTexto(p.nome),
        String(p.total),
        String(p.finalizados),
        String(p.no_prazo),
        String(p.atrasados),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    })
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(`Página ${i} de ${totalPages}`, 105, doc.internal.pageSize.height - 10, { align: 'center' })
    doc.text('Estúdio de Gravação - Sistema de Gestão', 14, doc.internal.pageSize.height - 10)
  }

  doc.save(`relatorio-${dados.periodoInicio}-a-${dados.periodoFim}.pdf`)
}

export function exportarRelatorioGeralCSV(dados: DadosRelatorioGeral) {
  const linhas: string[] = []

  linhas.push(`Relatório Geral`)
  linhas.push(`Período: ${formatDate(dados.periodoInicio)} a ${formatDate(dados.periodoFim)}`)
  linhas.push(`Gerado em: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}`)
  linhas.push('')

  // Indicadores
  linhas.push('INDICADORES CHAVE')
  linhas.push('Indicador;Valor')
  linhas.push(`Total Vendido;${dados.totalVendido.toFixed(2)}`)
  linhas.push(`Total Recebido;${dados.totalRecebido.toFixed(2)}`)
  linhas.push(`Taxa de Conversao;${dados.conversao.taxa}%`)
  linhas.push(`Vendas Realizadas;${dados.conversao.realizada}`)
  linhas.push(`Vendas Canceladas;${dados.conversao.cancelada}`)
  linhas.push('')

  // Vendas por mês
  if (dados.vendasMes.length > 0) {
    linhas.push('VENDAS POR MES')
    linhas.push('Mes;Vendido;Recebido;Quantidade')
    dados.vendasMes.forEach((m: any) => {
      linhas.push(`${m.mes};${m.vendido.toFixed(2)};${m.recebido.toFixed(2)};${m.count}`)
    })
    linhas.push('')
  }

  // Top clientes
  if (dados.topClientes.length > 0) {
    linhas.push('TOP CLIENTES')
    linhas.push('Posicao;Cliente;Vendas;Total')
    dados.topClientes.forEach((c: any, i: number) => {
      linhas.push(`${i + 1};${c.nome};${c.count};${c.total.toFixed(2)}`)
    })
    linhas.push('')
  }

  // Projetos por status
  if (dados.projetosStatus.length > 0) {
    linhas.push('PROJETOS POR STATUS')
    linhas.push('Status;Quantidade')
    dados.projetosStatus.forEach((p: any) => {
      linhas.push(`${STATUS_LABEL[p.name] || p.name};${p.value}`)
    })
    linhas.push('')
  }

  // Performance equipe
  if (dados.performanceEquipe.length > 0) {
    linhas.push('PERFORMANCE EQUIPE')
    linhas.push('Editor;Total;Finalizados;No Prazo;Atrasados')
    dados.performanceEquipe.forEach((p: any) => {
      linhas.push(`${p.nome};${p.total};${p.finalizados};${p.no_prazo};${p.atrasados}`)
    })
  }

  const csv = '﻿' + linhas.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-${dados.periodoInicio}-a-${dados.periodoFim}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
