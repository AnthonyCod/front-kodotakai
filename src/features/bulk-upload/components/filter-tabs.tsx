/** Selector de dos o más filtros (p. ej. «Con error» / «Todas»). */
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  /** [valor, texto, cuántos] — el número va al lado («Con error · 2»). */
  options: readonly (readonly [T, string, number?])[]
  onChange: (value: T) => void
}) {
  return (
    <div className="grid w-full auto-cols-fr grid-flow-col gap-1 rounded-full bg-muted p-1 sm:w-96">
      {options.map(([option, label, count]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-card"
        >
          {label}
          {count !== undefined && <span className="text-brand-deep tabular-nums"> · {count}</span>}
        </button>
      ))}
    </div>
  )
}
