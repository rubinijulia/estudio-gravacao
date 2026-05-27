export type CepData = {
  cep: string
  logradouro: string
  bairro: string
  localidade: string
  uf: string
  complemento?: string
}

export async function buscarCep(cep: string): Promise<CepData | null> {
  const cepLimpo = cep.replace(/\D/g, '')

  if (cepLimpo.length !== 8) {
    return null
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const data = await response.json()

    if (data.erro) {
      return null
    }

    return data
  } catch (err) {
    console.error('Erro ao buscar CEP:', err)
    return null
  }
}

export function formatarCep(cep: string): string {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length <= 5) return cepLimpo
  return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5, 8)}`
}
