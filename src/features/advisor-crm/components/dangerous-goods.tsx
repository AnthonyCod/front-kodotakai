import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, FlaskConical, Truck } from 'lucide-react'
import { cn } from 'cn'
import { toPlainText } from '@/shared/lib/plain-text'
import { ErrorText } from '@/shared/ui/error-text'
import {
  OBSERVATIONS_MAX,
  OBSERVATIONS_MIN,
  listDangerousGoods,
  reviewDangerousGoods,
  type DangerousGoodsItem,
  type DangerousGoodsState,
  type ReviewDecision,
} from '../api/dangerous-goods-api'
import { formatDayTime, useNow } from '../model/time'
import { useToasts } from '../model/toast-store'
import { ActionButton, Badge, Card, EmptyStage } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

const TABS: { id: DangerousGoodsState; label: string }[] = [
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'REVISADO', label: 'Revisados' },
]

/**
 * Envíos B2B declarados como mercancía peligrosa. El REVIEWER aprueba o rechaza con
 * observaciones; el ADMIN solo consulta. La decisión queda registrada pero aún no bloquea el envío.
 */
export function DangerousGoodsReview({ canDecide }: { canDecide: boolean }) {
  const [tab, setTab] = useState<DangerousGoodsState>('PENDIENTE')
  const query = useQuery({
    queryKey: ['asesor', 'mercancia-peligrosa', tab],
    queryFn: () => listDangerousGoods(tab),
  })
  const now = useNow(60_000)

  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold">Mercancía peligrosa</h1>
        <p className="text-xs text-muted-foreground">Envíos B2B que esperan revisión</p>
      </header>
      <div role="tablist" aria-label="Estado" className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'h-9 rounded-full border px-4 text-sm transition',
              tab === t.id
                ? 'border-primary bg-primary font-medium text-primary-foreground'
                : 'bg-card',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!canDecide && (
        <p className="text-xs text-muted-foreground">
          Solo un revisor (REVIEWER) puede aprobar o rechazar. Tu cuenta puede consultar.
        </p>
      )}
      <ErrorText error={query.error} />
      {query.isPending && <Card className="h-32 animate-pulse" />}
      {query.data?.items.length === 0 && (
        <EmptyStage
          title={tab === 'PENDIENTE' ? 'Nada pendiente de revisión' : 'Aún no hay revisiones'}
          text="Los envíos con mercancía peligrosa de los lotes B2B aparecen aquí."
        />
      )}
      <ul className="grid gap-3 lg:grid-cols-2">
        {query.data?.items.map((item) => (
          <li key={item.shipment_id}>
            <ShipmentCard item={item} now={now} canDecide={canDecide} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShipmentCard({
  item,
  now,
  canDecide,
}: {
  item: DangerousGoodsItem
  now: number
  canDecide: boolean
}) {
  const review = item.revision
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-semibold text-primary tabular-nums">
            <Truck className="size-4" {...ICON} /> {item.numero_guia}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {item.codigo_trayecto} · {formatDayTime(item.created_at, now)}
          </p>
        </div>
        {review ? (
          <Badge tone={review.decision === 'APROBADA' ? 'success' : 'danger'}>
            {review.decision === 'APROBADA' ? 'Aprobada' : 'Rechazada'}
          </Badge>
        ) : (
          <Badge tone="warning">
            <FlaskConical className="size-3.5" {...ICON} /> Pendiente
          </Badge>
        )}
      </div>
      {review ? (
        <blockquote className="rounded-lg bg-muted/70 p-3 text-sm">
          {toPlainText(review.observaciones)}
          <footer className="mt-1 text-xs text-muted-foreground">
            Revisado {formatDayTime(review.created_at, now)}
          </footer>
        </blockquote>
      ) : (
        canDecide && <ReviewForm shipmentId={item.shipment_id} />
      )}
    </Card>
  )
}

function ReviewForm({ shipmentId }: { shipmentId: string }) {
  const queryClient = useQueryClient()
  const show = useToasts((s) => s.show)
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState<ReviewDecision | null>(null)
  const valid = notes.trim().length >= OBSERVATIONS_MIN && decision !== null

  const mutation = useMutation({
    mutationFn: (d: ReviewDecision) => reviewDangerousGoods(shipmentId, d, notes.trim()),
    onSuccess: (review) => {
      void queryClient.invalidateQueries({ queryKey: ['asesor', 'mercancia-peligrosa'] })
      show({
        text:
          review.decision === 'APROBADA' ? 'Envío aprobado' : 'Envío rechazado · quedó registrado',
      })
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid && decision) mutation.mutate(decision)
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Observaciones</span>
        <textarea
          rows={3}
          maxLength={OBSERVATIONS_MAX}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej.: MSDS vigente, embalaje UN homologado y rotulado verificados."
          className="w-full resize-none rounded-lg border bg-muted/60 p-3 text-base outline-none focus:border-primary sm:text-sm"
        />
      </label>
      <div role="radiogroup" aria-label="Decisión" className="grid grid-cols-2 gap-2">
        {(['APROBADA', 'RECHAZADA'] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={decision === d}
            onClick={() => setDecision(d)}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition',
              decision === d && d === 'APROBADA' && 'border-success bg-success/10 text-success',
              decision === d &&
                d === 'RECHAZADA' &&
                'border-destructive bg-destructive/10 text-destructive',
            )}
          >
            {d === 'APROBADA' ? (
              <CircleCheck className="size-4" {...ICON} />
            ) : (
              <CircleX className="size-4" {...ICON} />
            )}
            {d === 'APROBADA' ? 'Aprobar' : 'Rechazar'}
          </button>
        ))}
      </div>
      <ErrorText error={mutation.error} />
      <ActionButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={!valid || mutation.isPending}
      >
        {mutation.isPending ? 'Guardando…' : 'Registrar decisión (no se puede cambiar)'}
      </ActionButton>
    </form>
  )
}
