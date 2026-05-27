/**
 * Verifica se um cliente tem cadastro completo.
 * Considera completo se tiver:
 * - Nome (obrigatório)
 * - Telefone OU Email
 * - Cidade OU CEP
 * - Documento (CPF/CNPJ)
 */
export function isCadastroCompleto(cliente: any): boolean {
  if (!cliente) return false
  if (!cliente.nome) return false

  const temContato = !!(cliente.telefone || cliente.email)
  const temEndereco = !!(cliente.cidade || cliente.cep)
  const temDocumento = !!cliente.documento

  return temContato && temEndereco && temDocumento
}

/**
 * Retorna o que está faltando no cadastro
 */
export function camposFaltando(cliente: any): string[] {
  const faltam: string[] = []

  if (!cliente.telefone && !cliente.email) faltam.push('Contato (telefone ou email)')
  if (!cliente.cidade && !cliente.cep) faltam.push('Endereço')
  if (!cliente.documento) faltam.push('CPF/CNPJ')

  return faltam
}
