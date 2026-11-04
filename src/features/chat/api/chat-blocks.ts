import { z } from 'zod'

/** Texto del bot. Puede traer Markdown o LaTeX sin procesar: se muestra como texto plano. */
export const textBlockSchema = z.object({
  type: z.literal('TEXT'),
  text: z.string().min(1),
})
export type TextBlock = z.infer<typeof textBlockSchema>

/** Web: el botón se envía como texto; ver `resolveQuickReply`. */
export const quickRepliesBlockSchema = z.object({
  type: z.literal('QUICK_REPLIES'),
  options: z.array(z.object({ id: z.string(), title: z.string().min(1) })).min(1),
})
export type QuickRepliesBlock = z.infer<typeof quickRepliesBlockSchema>
