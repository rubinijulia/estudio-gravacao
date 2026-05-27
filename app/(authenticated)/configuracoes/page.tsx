'use client'

import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Wrench, DollarSign, Target, Calendar, Settings as SettingsIcon, Webhook, Mic2 } from 'lucide-react'

export default function ConfiguracoesPage() {
  const sections = [
    {
      icon: Wrench,
      title: 'Catálogo de Serviços',
      description: 'Cadastre e gerencie os serviços oferecidos',
      href: '/servicos',
    },
    {
      icon: Mic2,
      title: 'Estúdios',
      description: 'Cadastre os estúdios e vincule a calendários Google',
      href: '/configuracoes/estudios',
    },
    {
      icon: Users,
      title: 'Usuários da Equipe',
      description: 'Gerencie usuários e permissões',
      href: '/configuracoes/usuarios',
    },
    {
      icon: DollarSign,
      title: 'Custos Fixos',
      description: 'Aluguel, software, contabilidade...',
      href: '/financeiro',
    },
    {
      icon: Target,
      title: 'Metas Mensais',
      description: 'Defina metas de venda por mês',
      href: '/configuracoes/metas',
    },
    {
      icon: Calendar,
      title: 'Feriados',
      description: 'Datas consideradas no cálculo de prazo',
      href: '/configuracoes/feriados',
    },
    {
      icon: SettingsIcon,
      title: 'Parâmetros Gerais',
      description: 'Prazos padrão, taxas de cartão, horários',
      href: '/configuracoes/parametros',
    },
    {
      icon: Calendar,
      title: 'Google Calendar',
      description: 'Sincronização com agenda do Google',
      href: '/configuracoes/google-calendar',
    },
    {
      icon: Webhook,
      title: 'Integrações / API',
      description: 'WhatsApp diário (Cowork, Zapier, n8n)',
      href: '/configuracoes/integracoes',
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.title} href={section.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <Icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
