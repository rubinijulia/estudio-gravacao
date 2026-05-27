'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/use-user'
import { Card, CardContent } from '@/components/ui/card'
import { ShieldAlert, Loader2 } from 'lucide-react'
import type { UserRole } from '@/types/database'

type Props = {
  allow: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allow, children }: Props) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && !allow.includes(user.role)) {
      // Redireciona para o dashboard depois de 2s
      const timer = setTimeout(() => router.push('/'), 2000)
      return () => clearTimeout(timer)
    }
  }, [user, loading, allow, router])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Não autenticado</h2>
            <p className="text-muted-foreground">Faça login para continuar.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!allow.includes(user.role)) {
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Sua permissão atual: <strong>{user.role}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Redirecionando para o dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
