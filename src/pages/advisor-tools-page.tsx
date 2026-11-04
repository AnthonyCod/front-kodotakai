import { useSearchParams } from 'react-router'
import { QuickTools } from '@/features/advisor-crm'

/** Ruta `/asesor/consulta` — Tracking TMS y base RAG durante una llamada. */
export function AdvisorToolsPage() {
  const [params] = useSearchParams()
  const guia = params.get('guia') ?? ''
  return <QuickTools key={guia} initialGuia={guia} />
}
