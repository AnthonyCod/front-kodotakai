import { ChannelMetricsTable } from '@/features/metrics'

/** Ruta `/interno/metricas` — Métricas por canal (M11). */
export function MetricsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-3">
      <p className="text-sm">Cuántas conversaciones, mensajes y casos de asesor hubo por canal.</p>
      <ChannelMetricsTable />
    </div>
  )
}
