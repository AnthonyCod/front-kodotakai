import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from 'cn'

/**
 * Código de referencia (cotización, caso) con botón para copiarlo. Se muestra corto y se copia
 * completo (`value`), que es el identificador que entiende el backend.
 */
export function CopyCode({
  label,
  code,
  value,
  className,
}: {
  label: string
  code: string
  value: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin permiso de portapapeles: el código sigue visible para copiarlo a mano.
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-sm font-semibold" title={value}>
          {code}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
