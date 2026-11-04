import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { formatDateTime } from '@/shared/lib/format'
import { ErrorText } from '@/shared/ui/error-text'
import { getHandoff, listHandoffs, updateHandoff, type HandoffStatus } from '../api/handoffs-api'
import { toPlainText } from '@/shared/lib/plain-text'

/**
 * Bandeja del asesor. El token se escribe aquí y queda solo en memoria (se pierde al recargar):
 * no puede ir en el bundle. Sin WebSocket todavía: se actualiza con el botón.
 */
export function AgentInbox() {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<HandoffStatus | ''>('PENDING')
  const [selected, setSelected] = useState<string | null>(null)

  if (!token) return <TokenForm onSubmit={setToken} />

  return (
    <div className="grid gap-3 md:grid-cols-[20rem_1fr]">
      <CaseList
        token={token}
        status={status}
        onStatus={setStatus}
        selected={selected}
        onSelect={setSelected}
        onLogout={() => setToken(null)}
      />
      {selected ? (
        <CaseDetail token={token} id={selected} />
      ) : (
        <p className="rounded border p-3 text-sm">Selecciona un caso.</p>
      )}
    </div>
  )
}

function TokenForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-2 rounded border p-3 text-sm">
      <label htmlFor="admin-token" className="block font-semibold">
        Token de asesor (X-Admin-Token)
      </label>
      <input
        id="admin-token"
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded border px-3 py-2 text-base"
      />
      <p className="text-xs">Solo se guarda en memoria mientras la pestaña esté abierta.</p>
      <button type="submit" className="rounded border px-3 py-1.5">
        Entrar
      </button>
    </form>
  )
}

function CaseList(props: {
  token: string
  status: HandoffStatus | ''
  onStatus: (s: HandoffStatus | '') => void
  selected: string | null
  onSelect: (id: string) => void
  onLogout: () => void
}) {
  const query = useQuery({
    queryKey: ['handoffs', props.status],
    queryFn: () => listHandoffs(props.token, props.status || undefined),
  })

  return (
    <section className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Estado"
          value={props.status}
          onChange={(e) => props.onStatus(e.target.value as HandoffStatus | '')}
          className="rounded border px-2 py-1"
        >
          <option value="PENDING">Pendientes</option>
          <option value="ASSIGNED">Asignados</option>
          <option value="CLOSED">Cerrados</option>
          <option value="">Todos</option>
        </select>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? 'Cargando…' : 'Actualizar'}
        </button>
        <button type="button" className="rounded border px-2 py-1" onClick={props.onLogout}>
          Salir
        </button>
      </div>
      <ErrorText error={query.error} />
      {query.data?.items.length === 0 && <p>No hay casos.</p>}
      <ul className="space-y-2">
        {query.data?.items.map((item) => (
          <li key={item.handoff_id}>
            <button
              type="button"
              onClick={() => props.onSelect(item.handoff_id)}
              className="w-full rounded border p-2 text-left aria-pressed:border-2"
              aria-pressed={props.selected === item.handoff_id}
            >
              <p className="font-semibold">
                {item.prioridad} · {item.cola_destino}
              </p>
              <p className="text-xs">
                {item.canal} · {item.status} · {formatDateTime(item.created_at)}
              </p>
              {item.numero_guia_consultada && (
                <p className="text-xs">Guía {item.numero_guia_consultada}</p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CaseDetail({ token, id }: { token: string; id: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['handoff', id], queryFn: () => getHandoff(token, id) })
  const mutation = useMutation({
    mutationFn: (status: 'ASSIGNED' | 'CLOSED') => updateHandoff(token, id, status),
    onSuccess: (data) => {
      queryClient.setQueryData(['handoff', id], data)
      void queryClient.invalidateQueries({ queryKey: ['handoffs'] })
    },
  })
  const data = query.data

  return (
    <section className="space-y-3 rounded border p-3 text-sm">
      <ErrorText error={query.error ?? mutation.error} />
      {query.isPending && <p>Cargando…</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="font-semibold">
              {data.prioridad} · {data.cola_destino} · {data.status}
            </p>
            <p className="text-xs">
              {data.canal} · sentimiento {data.sentimiento_detectado} · intentos previos{' '}
              {data.intentos_previos}
            </p>
          </header>
          <div className="flex gap-2">
            {data.status === 'PENDING' && (
              <button
                type="button"
                className="rounded border px-3 py-1"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('ASSIGNED')}
              >
                Asignarme
              </button>
            )}
            {data.status !== 'CLOSED' && (
              <button
                type="button"
                className="rounded border px-3 py-1"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate('CLOSED')}
              >
                Cerrar
              </button>
            )}
          </div>
          <div>
            <p className="font-semibold">Resumen</p>
            <p className="whitespace-pre-wrap">{toPlainText(data.resumen_contexto)}</p>
          </div>
          <div>
            <p className="font-semibold">Motivos</p>
            <ul className="list-inside list-disc">
              {data.triggers.map((t) => (
                <li key={t.id_criterio + t.evidencia}>
                  {t.id_criterio}: {t.evidencia}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">Historial</p>
            <ol className="space-y-1">
              {data.historial.map((item, index) => (
                <li key={index} className="border-t pt-1">
                  <span className="text-xs">
                    {item.rol} · {formatDateTime(item.timestamp)}
                  </span>
                  <p className="whitespace-pre-wrap">{toPlainText(item.texto)}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  )
}
