import { AdminUsers } from '@/features/advisor-crm'
import { useSession } from '@/features/auth'

/** Ruta `/asesor/admin/usuarios` (ADMIN). */
export function AdminUsersPage() {
  const { user } = useSession()
  return <AdminUsers myStaffId={user?.staff_user_id ?? null} />
}
