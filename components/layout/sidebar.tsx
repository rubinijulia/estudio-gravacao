'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  ShoppingCart,
  Calendar,
  Kanban,
  DollarSign,
  Settings,
  FileText,
  Wrench,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/lib/use-user'
import type { UserRole } from '@/types/database'

type NavItem = {
  icon: any
  label: string
  href: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { icon: BarChart3, label: 'Dashboard', href: '/', roles: ['admin', 'editor', 'operacional'] },
  { icon: Calendar, label: 'Agenda', href: '/agenda', roles: ['admin', 'editor', 'operacional'] },
  { icon: ShoppingCart, label: 'Vendas', href: '/vendas', roles: ['admin', 'editor'] },
  { icon: Users, label: 'Clientes', href: '/clientes', roles: ['admin', 'editor'] },
  { icon: Wrench, label: 'Serviços', href: '/servicos', roles: ['admin', 'editor'] },
  { icon: Kanban, label: 'Projetos', href: '/projetos', roles: ['admin', 'editor'] },
  { icon: DollarSign, label: 'Financeiro', href: '/financeiro', roles: ['admin'] },
  { icon: FileText, label: 'Relatórios', href: '/relatorios', roles: ['admin'] },
  { icon: Settings, label: 'Configurações', href: '/configuracoes', roles: ['admin'] },
]

const ROLE_LABEL: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-500' },
  editor: { label: 'Editor', color: 'bg-blue-500' },
  operacional: { label: 'Operacional', color: 'bg-green-500' },
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, loading } = useUser()

  const itensVisiveis = user
    ? navItems.filter((item) => item.roles.includes(user.role))
    : []

  return (
    <aside className="w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">Estúdio</h1>
        <p className="text-sm text-slate-400">Gestão de Produção</p>
      </div>

      {user && (
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn('w-2 h-2 rounded-full', ROLE_LABEL[user.role]?.color)} />
            <span className="text-slate-400">
              {user.nome} · {ROLE_LABEL[user.role]?.label}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 space-y-2">
        {loading ? (
          <div className="px-4 py-2 text-sm text-slate-500">Carregando...</div>
        ) : (
          itensVisiveis.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })
        )}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-400">Versão 1.0</p>
      </div>
    </aside>
  )
}
