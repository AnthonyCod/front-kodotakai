import { useQuery } from '@tanstack/react-query'
import { formatDateTime } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/error-text'
import { getChannelMetrics } from '../api/metrics-api'

export function ChannelMetricsTable() {
  const query = useQuery({ queryKey: ['metrics', 'channels'], queryFn: getChannelMetrics })

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Uso por canal</h2>
        <button
          type="button"
          className="rounded border px-2 py-1 text-sm"
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>
      <ErrorText error={query.error} />
      {query.data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Canal</th>
                  <th className="p-2">Conversaciones</th>
                  <th className="p-2">Entrantes</th>
                  <th className="p-2">Salientes</th>
                  <th className="p-2">Handoffs</th>
                </tr>
              </thead>
              <tbody>
                {query.data.canales.map((row) => (
                  <tr key={row.channel} className="border-b">
                    <td className="p-2">{row.channel}</td>
                    <td className="p-2">{row.conversaciones}</td>
                    <td className="p-2">{row.mensajes_entrantes}</td>
                    <td className="p-2">{row.mensajes_salientes}</td>
                    <td className="p-2">{row.handoffs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs">Generado: {formatDateTime(query.data.generado_en)}</p>
        </>
      )}
    </section>
  )
}
