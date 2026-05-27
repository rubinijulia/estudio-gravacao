export type UserRole = 'admin' | 'editor' | 'operacional'

export type UserProfile = {
  id: string
  nome: string
  role: UserRole
  ativo: boolean
  valor_hora: number | null
  created_at: string
  updated_at: string
}

export type Cliente = {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  documento: string | null
  instagram: string | null
  observacoes: string | null
  tags: string[] | null
  cep: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cadastro_completo: boolean
  created_at: string
  updated_at: string
}

export type Servico = {
  id: string
  nome: string
  categoria: 'podcast' | 'hora_avulsa' | 'plano_mensal' | 'diaria' | 'pos_producao' | 'identidade' | 'curso' | 'merch' | 'outros'
  valor_padrao: number
  descricao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export type VendaStatus = 'a_receber' | 'sinal_pago' | 'totalmente_recebido' | 'cancelado'
export type ServicoStatus = 'em_curso' | 'realizada' | 'cancelada'

export type Venda = {
  id: string
  cliente_id: string
  data_venda: string
  valor_total: number
  desconto: number
  forma_pagamento: 'pix' | 'debito' | 'credito' | 'transferencia' | 'dinheiro'
  parcelas: number
  taxa_cartao: number
  status_pagamento: VendaStatus
  status_servico: ServicoStatus
  valor_sinal: number | null
  data_sinal: string | null
  data_quitacao: string | null
  observacoes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type VendaItem = {
  id: string
  venda_id: string
  servico_id: string | null
  descricao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  created_at: string
  updated_at: string
}

export type Agendamento = {
  id: string
  cliente_id: string
  venda_id: string | null
  titulo: string
  data: string
  hora_inicio: string
  hora_fim: string
  estudio: string | null
  tipo: 'gravacao' | 'reuniao' | 'outro'
  gravacao_realizada: boolean
  data_check: string | null
  checked_by: string | null
  observacoes: string | null
  google_event_id: string | null
  google_calendar_id: string | null
  created_at: string
  updated_at: string
}

export type ProjetoStatus = 'gravado' | 'editando' | 'cortes' | 'enviado' | 'em_ajuste' | 'finalizado'
export type ProjetoFormato = 'podcast' | 'live' | 'video_curso' | 'video_institucional' | 'outro'

export type Projeto = {
  id: string
  agendamento_id: string
  cliente_id: string
  venda_id: string | null
  titulo: string
  formato: ProjetoFormato
  tem_edicao: boolean
  tem_cortes: boolean
  quantidade_cortes: number
  tem_identidade_visual: boolean
  tem_legendas: boolean
  data_gravacao: string
  data_entrega_prevista: string
  data_entrega_real: string | null
  prazo_personalizado: boolean
  status: ProjetoStatus
  responsavel_id: string | null
  observacoes: string | null
  arquivos_link: string | null
  created_at: string
  updated_at: string
}

export type ProjetoHistorico = {
  id: string
  projeto_id: string
  status_anterior: string | null
  status_novo: string
  movido_por: string
  data_movimentacao: string
  observacao: string | null
  created_at: string
  updated_at: string
}

export type CustoFixo = {
  id: string
  nome: string
  categoria: 'aluguel' | 'pro_labore' | 'software' | 'marketing' | 'contabilidade' | 'outros'
  valor: number
  dia_vencimento: number | null
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type CustoVariavel = {
  id: string
  competencia: string
  descricao: string
  colaborador_id: string | null
  horas_trabalhadas: number | null
  valor_hora: number | null
  valor_total: number
  created_at: string
  updated_at: string
}

export type Meta = {
  id: string
  competencia: string
  meta_vendas: number
  meta_gravacoes: number | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type Recebimento = {
  id: string
  venda_id: string
  valor: number
  data_recebimento: string
  tipo: 'sinal' | 'quitacao' | 'parcela' | 'avulso'
  forma_pagamento: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}
