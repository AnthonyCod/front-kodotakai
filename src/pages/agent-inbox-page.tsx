import { AgentInbox } from '@/features/agent-inbox'

/** Ruta `/interno/asesor` — Bandeja de asesor (M9). */
export function AgentInboxPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-3 p-3">
      <p className="text-sm">
        Casos que la IA pasó a un asesor: revisar el contexto, asignarse y cerrar.
      </p>
      <AgentInbox />
    </div>
  )
}
