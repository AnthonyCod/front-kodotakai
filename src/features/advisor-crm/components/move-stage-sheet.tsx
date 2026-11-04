import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import type { FunnelStage } from '../api/crm-api'
import { STAGE } from '../model/funnels'
import { isStaleVersion, useCloseSale, useMoveLead } from '../model/use-crm'
import { Sheet } from './sheet'
import { ActionButton, Badge } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

const FIELD =
  'h-11 w-full rounded-lg border bg-card px-3 text-base outline-none focus:border-primary sm:text-sm'

/**
 * Elegir la nueva etapa de un lead. Mover muestra un toast con «Deshacer». «Venta cerrada» pasa
 * a un formulario de cierre (destinatario) porque emite la guía y no se puede deshacer.
 */
export function MoveStageSheet({
  leadId,
  current,
  version,
  stages,
  subtitle,
  client,
  onClose,
}: {
  leadId: string
  current: string
  version: number
  stages: FunnelStage[]
  subtitle: string
  client?: { nombre: string; telefono: string }
  onClose: () => void
}) {
  const [selected, setSelected] = useState(current)
  const [reason, setReason] = useState('')
  const [closing, setClosing] = useState(false)
  const move = useMoveLead()
  const discarding = selected === STAGE.descartado && selected !== current

  const confirm = () => {
    if (selected === current) return onClose()
    if (selected === STAGE.ventaCerrada) return setClosing(true)
    move.mutate(
      {
        leadId,
        from: current,
        move: { etapa: selected, expected_version: version, motivo: reason.trim() || undefined },
      },
      { onSuccess: onClose, onError: (e) => isStaleVersion(e) && onClose() },
    )
  }

  if (closing) {
    return (
      <CloseSaleForm
        leadId={leadId}
        version={version}
        subtitle={subtitle}
        client={client}
        onBack={() => setClosing(false)}
        onClose={onClose}
      />
    )
  }

  return (
    <Sheet title="Mover cliente de etapa" subtitle={subtitle} onClose={onClose}>
      <fieldset className="space-y-2.5">
        <legend className="sr-only">Etapa</legend>
        {stages.map((stage) => (
          <label
            key={stage.id}
            className={cn(
              'flex h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 transition has-focus-visible:ring-3 has-focus-visible:ring-ring/40',
              selected === stage.id && 'border-primary bg-primary-subtle font-medium',
            )}
          >
            <input
              type="radio"
              name="etapa"
              value={stage.id}
              checked={selected === stage.id}
              onChange={() => setSelected(stage.id)}
              className="size-[18px] accent-primary"
            />
            <span className="flex-1">{stage.nombre}</span>
            {stage.id === current && <Badge>Actual</Badge>}
          </label>
        ))}
      </fieldset>
      {discarding && (
        <label className="mt-3 block space-y-1 text-sm">
          <span className="font-medium">Motivo del descarte</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej.: el cliente contrató con otra transportadora"
            className="w-full resize-none rounded-lg border bg-card p-3 text-base outline-none focus:border-primary sm:text-sm"
          />
        </label>
      )}
      {move.isError && !isStaleVersion(move.error) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          No se pudo mover el cliente. Intenta de nuevo.
        </p>
      )}
      <ActionButton
        variant="primary"
        className="mt-3 h-12 w-full"
        disabled={move.isPending || (discarding && !reason.trim())}
        onClick={confirm}
      >
        {selected === STAGE.ventaCerrada && selected !== current ? (
          <>
            Continuar al cierre <ArrowRight {...ICON} />
          </>
        ) : (
          <>
            <Check {...ICON} />
            {move.isPending ? 'Moviendo…' : 'Confirmar cambio de etapa'}
          </>
        )}
      </ActionButton>
    </Sheet>
  )
}

function CloseSaleForm({
  leadId,
  version,
  subtitle,
  client,
  onBack,
  onClose,
}: {
  leadId: string
  version: number
  subtitle: string
  client?: { nombre: string; telefono: string }
  onBack: () => void
  onClose: () => void
}) {
  const close = useCloseSale()
  const [recipient, setRecipient] = useState({
    nombre: client?.nombre ?? '',
    telefono: client?.telefono ?? '',
    direccion: '',
  })
  const complete = Object.values(recipient).every((v) => v.trim())

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!complete) return
    close.mutate(
      { leadId, expectedVersion: version, recipient },
      { onSuccess: onClose, onError: (err) => isStaleVersion(err) && onClose() },
    )
  }

  const field = (key: keyof typeof recipient, label: string, props: object = {}) => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        required
        value={recipient[key]}
        onChange={(e) => setRecipient((r) => ({ ...r, [key]: e.target.value }))}
        className={FIELD}
        {...props}
      />
    </label>
  )

  return (
    <Sheet title="Cerrar venta" subtitle={subtitle} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm font-semibold">Destinatario del envío</p>
        {field('nombre', 'Nombre', { autoComplete: 'off' })}
        {field('telefono', 'Teléfono', { type: 'tel', inputMode: 'tel', autoComplete: 'off' })}
        {field('direccion', 'Dirección de entrega', {
          autoComplete: 'off',
          placeholder: 'Ej.: Calle 26 # 96J-15, Bodega 4',
        })}
        <p className="flex gap-2 rounded-lg bg-warning/15 p-3 text-xs text-warning-strong">
          <TriangleAlert className="size-4 shrink-0" {...ICON} />
          Al confirmar se emite la guía y la venta ya no se puede deshacer. Un envío emitido solo lo
          anula Operaciones.
        </p>
        {close.isError && !isStaleVersion(close.error) && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo cerrar la venta. Revisa los datos e intenta de nuevo.
          </p>
        )}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <ActionButton className="h-12" onClick={onBack} disabled={close.isPending}>
            Volver
          </ActionButton>
          <ActionButton
            type="submit"
            variant="primary"
            className="h-12"
            disabled={!complete || close.isPending}
          >
            <Check {...ICON} />
            {close.isPending ? 'Emitiendo guía…' : 'Cerrar venta y emitir guía'}
          </ActionButton>
        </div>
      </form>
    </Sheet>
  )
}
