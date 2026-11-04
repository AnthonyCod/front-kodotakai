import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from 'cn'
import type { FunnelStage } from '../api/crm-api'
import { useMoveLead } from '../model/use-crm'
import { Sheet } from './sheet'
import { ActionButton, Badge } from './ui'

/** Elegir la nueva etapa de un lead. Al confirmar se muestra un toast con «Deshacer». */
export function MoveStageSheet({
  leadId,
  current,
  stages,
  subtitle,
  onClose,
}: {
  leadId: string
  current: string
  stages: FunnelStage[]
  subtitle: string
  onClose: () => void
}) {
  const [selected, setSelected] = useState(current)
  const move = useMoveLead()

  const confirm = () => {
    if (selected === current) return onClose()
    move.mutate({ leadId, etapa: selected, from: current }, { onSuccess: onClose })
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
      {move.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          No se pudo mover el cliente. Intenta de nuevo.
        </p>
      )}
      <ActionButton
        variant="primary"
        className="mt-3 h-12 w-full"
        disabled={move.isPending}
        onClick={confirm}
      >
        <Check strokeWidth={1.75} aria-hidden />
        {move.isPending ? 'Moviendo…' : 'Confirmar cambio de etapa'}
      </ActionButton>
    </Sheet>
  )
}
