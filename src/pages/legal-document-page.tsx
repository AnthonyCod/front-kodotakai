import { useParams } from 'react-router'
import { LegalDocumentView } from '@/features/legal'

/** Ruta `/info/:slug` — un documento legal. */
export function LegalDocumentPage() {
  const { slug = '' } = useParams()
  return <LegalDocumentView slug={slug} />
}
