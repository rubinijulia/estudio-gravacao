import { RoleGuard } from '@/components/role-guard'

export default function ServicosLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin', 'editor']}>{children}</RoleGuard>
}
