import { cn } from 'cn'
import { formatCop } from '@/shared/lib/format'
import { CopyCode } from '@/shared/ui/copy-code'
import type { ShipmentRequest } from '../api/shipments-api'
import { STATE_LABEL, STATE_TONE, dateTime } from '../model/requests'

/** Una solicitud: ruta, precio congelado, estado y, según el estado, guía o motivo. */
export function RequestCard({ request }: { request: ShipmentRequest }) {
  return (
    <li className="space-y-3 rounded-[1.25rem] bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {request.origen} → {request.destino}
          </p>
          <p className="text-xs text-muted-foreground">
            Solicitado el {dateTime(request.solicitado_en)}
          </p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs', STATE_TONE[request.estado])}>
          {STATE_LABEL[request.estado]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Total</dt>
          <dd className="font-medium">{formatCop(request.flete_total_cop)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Peso facturable</dt>
          <dd>{request.peso_facturable_kg.toLocaleString('es-CO')} kg</dd>
        </div>
      </dl>

      {request.numero_guia && (
        <CopyCode label="Guía" code={request.numero_guia} value={request.numero_guia} />
      )}
      {request.motivo_rechazo && (
        <p className="rounded-xl bg-destructive/5 p-3 text-sm">
          <span className="font-medium">Motivo: </span>
          {request.motivo_rechazo}
        </p>
      )}
    </li>
  )
}
