'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error('Erro ao fazer logout')
        return
      }
      toast.success('Logout realizado com sucesso')
      router.push('/auth/login')
      router.refresh()
    } catch (err) {
      toast.error('Erro ao fazer logout')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <header className="border-b bg-white px-6 py-4 flex justify-between items-center">
      <div>
        <h2 className="text-lg font-semibold">Bem-vindo</h2>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        disabled={isLoading}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoading ? 'Saindo...' : 'Sair'}
      </Button>
    </header>
  )
}
