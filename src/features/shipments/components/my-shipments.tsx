import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import { PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import { fetchMyShipments } from '../api/shipments-api'
import { SHIPMENTS_QUERY_KEY } from '../model/requests'
import { RequestCard } from './request-card'

/** `/mis-envios`: solicitudes del usuario; las aprobadas traen su guía. */
export function MyShipments() {
  const query = useQuery({ queryKey: [...SHIPMENTS_QUERY_KEY, 'mios'], queryFn: fetchMyShipments })
  const items = query.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-3 sm:px-6 sm:py-6">
      <div>
        <h1 className="text-2xl font-medium">Mis envíos</h1>
        <p className="text-sm text-muted-foreground">
          Cada solicitud la revisa un encargado. Al aprobarla te damos el número de guía.
        </p>
      </div>
      {query.isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
      <ErrorText error={query.error} />
      {query.isSuccess && items.length === 0 && (
        <div className="space-y-3 rounded-[1.25rem] bg-card p-5 text-center shadow-card">
          <p className="text-sm text-muted-foreground">Aún no has solicitado envíos.</p>
          <Link to="/hacer-envio" className={cn(PRIMARY_BUTTON, 'inline-block rounded-full')}>
            Hacer un envío
          </Link>
        </div>
      )}
      <ul className="space-y-3">
        {items.map((request) => (
          <RequestCard key={request.cotizacion_id} request={request} />
        ))}
      </ul>
    </div>
  )
}
