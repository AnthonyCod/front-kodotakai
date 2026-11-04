import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import { AUDIT_ACTIONS, listAuditEvents, type AuditEvent } from '../api/staff-api'
import { formatDayTime, useNow } from '../model/time'
import { ActionButton, Badge, Card, EmptyStage } from './ui'

/** Auditoría (ADMIN): eventos más recientes primero. Sin credenciales ni datos personales. */
export function AdminAudit() {
  const [action, setAction] = useState('')
  const query = useQuery({
    queryKey: ['asesor', 'auditoria', action],
    queryFn: () => listAuditEvents(action),
  })
  const now = useNow(60_000)

  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <p className="text-xs text-muted-foreground">Accesos y cambios registrados</p>
      </header>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Acción</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-10 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="">Todas</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <ActionButton onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw
            className={cn(query.isFetching && 'animate-spin')}
            strokeWidth={1.75}
            aria-hidden
          />
          Actualizar
        </ActionButton>
      </div>
      <ErrorText error={query.error} />
      {query.isPending && <Card className="h-40 animate-pulse" />}
      {query.data?.items.length === 0 && (
        <EmptyStage title="Sin eventos" text="No hay eventos con ese filtro." />
      )}
      {!!query.data?.items.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Cuándo</th>
                <th className="px-4 py-2.5 font-medium">Acción</th>
                <th className="px-4 py-2.5 font-medium">HTTP</th>
                <th className="px-4 py-2.5 font-medium">Quién</th>
                <th className="px-4 py-2.5 font-medium">Recurso</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((e) => (
                <Row key={e.id} event={e} now={now} />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

const short = (id: string | null) => (id ? id.slice(0, 8) : '—')

function Row({ event, now }: { event: AuditEvent; now: number }) {
  const tone = event.http_status >= 400 ? 'danger' : 'success'
  const who = event.staff_user_id
    ? `Personal ${short(event.staff_user_id)}`
    : event.client_id
      ? `Cliente ${short(event.client_id)}`
      : 'Anónimo'
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDayTime(event.created_at, now)}
      </td>
      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{event.action}</td>
      <td className="px-4 py-2.5">
        <Badge tone={tone}>{event.http_status}</Badge>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">{who}</td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {[event.resource_type, event.resource_id].filter(Boolean).join(' · ') || '—'}
      </td>
    </tr>
  )
}
