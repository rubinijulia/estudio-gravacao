import { RoleGuard } from '@/components/role-guard'

export default function MensagemDoDiaLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>
}
