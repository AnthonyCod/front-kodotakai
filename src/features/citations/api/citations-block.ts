import { z } from 'zod'

export const citationsBlockSchema = z.object({
  type: z.literal('CITATIONS'),
  items: z
    .array(
      z.object({
        doc_code: z.string(),
        doc_title: z.string(),
        section_path: z.string(),
        chunk_id: z.string(),
        excerpt: z.string(),
      }),
    )
    .min(1),
})
export type CitationsBlock = z.infer<typeof citationsBlockSchema>
