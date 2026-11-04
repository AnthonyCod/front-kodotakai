import { z } from 'zod'

/** Llega con `status: ESCALATED`. El cliente puede seguir escribiendo mientras espera. */
export const handoffNoticeBlockSchema = z.object({
  type: z.literal('HANDOFF_NOTICE'),
  handoff_id: z.string(),
  prioridad: z.enum(['NORMAL', 'ALTA', 'URGENTE']),
  cola: z.enum([
    'SERVICIO_CLIENTE',
    'SUPERVISOR',
    'JURIDICO_PQRS',
    'EJECUTIVO_CUENTA',
    'OPERACIONES',
  ]),
  mensaje_cliente: z.string(),
  /** Valor configurable del backend, no un SLA. */
  tiempo_espera_estimado_segundos: z.number().int().nonnegative(),
})
export type HandoffNoticeBlock = z.infer<typeof handoffNoticeBlockSchema>
