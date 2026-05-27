import { RoleGuard } from '@/components/role-guard'

export default function NotasFiscaisLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={['admin']}>{children}</RoleGuard>
}
