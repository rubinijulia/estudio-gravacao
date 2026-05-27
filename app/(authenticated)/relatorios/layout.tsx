import { RoleGuard } from '@/components/role-guard'

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>
}
