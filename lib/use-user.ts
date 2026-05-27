'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export type CurrentUser = {
  id: string
  email: string
  nome: string
  role: UserRole
  ativo: boolean
} | null

export function useUser() {
  const [user, setUser] = useState<CurrentUser>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          setUser(null)
          return
        }

        const { data: profile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            nome: profile.nome,
            role: profile.role,
            ativo: profile.ativo,
          })
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  return { user, loading }
}

// Helpers de permissão
export function podeAcessar(role: UserRole | undefined, rotasPermitidas: UserRole[]): boolean {
  if (!role) return false
  return rotasPermitidas.includes(role)
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin'
}

export function isEditorOuAdmin(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'editor'
}
