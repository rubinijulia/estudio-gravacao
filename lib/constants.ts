export const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  OPERACIONAL: 'operacional',
} as const

export const PROJETO_STATUS = {
  GRAVADO: 'gravado',
  EDITANDO: 'editando',
  CORTES: 'cortes',
  ENVIADO: 'enviado',
  EM_AJUSTE: 'em_ajuste',
  FINALIZADO: 'finalizado',
} as const

export const PROJETO_STATUS_ORDER = [
  PROJETO_STATUS.GRAVADO,
  PROJETO_STATUS.EDITANDO,
  PROJETO_STATUS.CORTES,
  PROJETO_STATUS.ENVIADO,
  PROJETO_STATUS.EM_AJUSTE,
  PROJETO_STATUS.FINALIZADO,
]

export const VENDA_STATUS = {
  A_RECEBER: 'a_receber',
  SINAL_PAGO: 'sinal_pago',
  TOTALMENTE_RECEBIDO: 'totalmente_recebido',
  CANCELADO: 'cancelado',
} as const

export const SERVICO_STATUS = {
  EM_CURSO: 'em_curso',
  REALIZADA: 'realizada',
  CANCELADA: 'cancelada',
} as const

export const SERVICO_CATEGORIA = {
  PODCAST: 'podcast',
  HORA_AVULSA: 'hora_avulsa',
  PLANO_MENSAL: 'plano_mensal',
  DIARIA: 'diaria',
  POS_PRODUCAO: 'pos_producao',
  IDENTIDADE: 'identidade',
  CURSO: 'curso',
  MERCH: 'merch',
  OUTROS: 'outros',
} as const

export const TIMEZONE = 'America/Sao_Paulo'
export const LOCALE = 'pt-BR'
export const CURRENCY = 'BRL'
