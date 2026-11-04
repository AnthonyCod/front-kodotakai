import { DangerousGoodsReview } from '@/features/advisor-crm'
import { hasBackendRole, useSession } from '@/features/auth'

/** Ruta `/asesor/mercancia-peligrosa`. Decide solo el REVIEWER; el ADMIN consulta. */
export function AdvisorDangerousGoodsPage() {
  const { user } = useSession()
  // Sesión simulada (sin roles del backend): el asesor hace de REVIEWER.
  const canDecide = user?.roles ? hasBackendRole(user, 'REVIEWER') : user?.rol === 'ASESOR'
  return <DangerousGoodsReview canDecide={canDecide} />
}
