import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TIMEZONE } from './constants'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Converte string em Date sem problema de fuso horário.
 * Strings "YYYY-MM-DD" são tratadas como data local (não UTC).
 */
function parseLocalDate(dateStr: string): Date {
  // Se já tem hora (T), deixa o Date interpretar normalmente
  if (dateStr.includes('T')) {
    return new Date(dateStr)
  }
  // String "YYYY-MM-DD" - força meio-dia local pra evitar problema de fuso
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

export function formatDateTime(date: string | Date, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

export function parseDate(dateStr: string, formatStr: string = 'dd/MM/yyyy'): Date {
  return parse(dateStr, formatStr, new Date(), { locale: ptBR })
}

export function formatTime(time: string): string {
  // Assume time is in HH:mm format
  return time
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function getDaysUntilDate(date: Date | string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = typeof date === 'string' ? parseLocalDate(date) : new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Converte um Date para string YYYY-MM-DD usando o fuso local.
 */
export function dateToLocalString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD usando o fuso local.
 * Evita problemas de UTC quando o sistema é executado de noite.
 */
export function getTodayLocal(): string {
  return dateToLocalString(new Date())
}
