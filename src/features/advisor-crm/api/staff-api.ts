import { z } from 'zod'
import { bearer, httpClient } from '@/shared/api'

// Administración (solo ADMIN, contrato 1.7.0). No hay listado de usuarios y la API no devuelve el
// token de un usuario nuevo: lo emite el backend.

const isoDate = z.iso.datetime({ offset: true })

/** Roles internos que se pueden asignar (`CLIENT` responde 422). */
export const STAFF_ROLES = ['ADMIN', 'REVIEWER'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

const staffUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  nombre: z.string(),
  roles: z.array(z.string()),
  estado: z.string(),
  created_at: isoDate,
  updated_at: isoDate,
})
export type StaffUser = z.infer<typeof staffUserSchema>

export const createStaffUser = (body: { email: string; nombre: string; roles: StaffRole[] }) =>
  httpClient.post('/internal/staff-users', body, staffUserSchema, bearer())

/** Sobre el propio usuario responde 403 con `details.motivo = "propio_rol"`. */
export const updateStaffRoles = (userId: string, roles: StaffRole[]) =>
  httpClient.patch(
    `/internal/staff-users/${encodeURIComponent(userId)}/roles`,
    { roles },
    staffUserSchema,
    bearer(),
  )

const auditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  http_status: z.number(),
  request_id: z.string(),
  client_id: z.string().nullable(),
  staff_user_id: z.string().nullable(),
  resource_type: z.string().nullable(),
  resource_id: z.string().nullable(),
  created_at: isoDate,
})
export type AuditEvent = z.infer<typeof auditEventSchema>

/** Acciones que registra el backend (guía de roles, §5). */
export const AUDIT_ACTIONS = [
  'auth.failed',
  'access.denied',
  'staff.create',
  'staff.roles.update',
  'handoff.read',
  'handoff.update',
  'dangerous_goods.read',
  'dangerous_goods.review',
  'batch.create',
  'batch.read',
  'batch.items.read',
  'rag.reindex',
  'audit.read',
] as const

export const listAuditEvents = (action: string, limit = 50) => {
  const params = new URLSearchParams({ limit: String(limit) })
  if (action) params.set('action', action)
  return httpClient.get(
    `/internal/audit-events?${params.toString()}`,
    z.object({ items: z.array(auditEventSchema) }),
    bearer(),
  )
}
