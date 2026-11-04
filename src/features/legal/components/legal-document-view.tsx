import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from 'cn'
import { InfoPanel } from '@/shared/ui/block-card'
import { GLASS } from '@/shared/ui/glass'
import { EmptyResult } from '@/shared/ui/metric'
import { findLegalDocument, type LegalSection } from '../model/documents'
import { formatLegalDate } from '../model/format-legal-date'

const CHIP = 'shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-foreground/70'

/** Un documento legal: versión, resumen "en 30 segundos", índice y secciones. */
export function LegalDocumentView({ slug }: { slug: string }) {
  const doc = findLegalDocument(slug)

  if (!doc)
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-3 sm:px-6 sm:py-6">
        <EmptyResult>
          <div className="space-y-3">
            <p>Este documento no existe.</p>
            <Link to="/info" className={`${GLASS} rounded-full px-4 py-2 text-foreground`}>
              Ver información legal
            </Link>
          </div>
        </EmptyResult>
      </div>
    )

  return (
    <article className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-6 sm:py-6">
      <Link
        to="/info"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} aria-hidden /> Información legal
      </Link>

      <header className="mt-3 space-y-3">
        <h1 className="text-2xl leading-tight font-medium sm:text-3xl">{doc.title}</h1>
        <div className="flex flex-wrap gap-2">
          <span className={CHIP}>Versión {doc.version}</span>
          <span className={CHIP}>Vigente desde {formatLegalDate(doc.effectiveDate)}</span>
          {doc.draft && (
            <span className={cn(CHIP, 'bg-warning/15 text-foreground/80')}>Borrador</span>
          )}
        </div>
      </header>

      <InfoPanel className="mt-5 space-y-2 p-4">
        <p className="text-sm font-medium">En 30 segundos</p>
        <ul className="space-y-1.5 text-[15px] leading-snug text-foreground/80">
          {doc.summary.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-deep/60" />
              {point}
            </li>
          ))}
        </ul>
      </InfoPanel>

      <div className="mt-5 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <Contents sections={doc.sections} />

        <div className="space-y-7 pt-4 lg:pt-0">
          {doc.sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-16 space-y-2">
              <h2 className="text-lg font-medium">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-[15px] leading-relaxed text-foreground/80">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-foreground/80">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t pt-5">
            <p className="text-sm text-muted-foreground">¿Te queda alguna duda?</p>
            <Link to="/" className={`${GLASS} rounded-full px-4 py-2 text-sm font-medium`}>
              Pregúntale a Logi
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

/** Índice: chips con scroll horizontal fijos arriba en móvil; columna lateral en escritorio. */
function Contents({ sections }: { sections: LegalSection[] }) {
  return (
    <nav
      aria-label="Contenido"
      className="sticky top-0 z-10 -mx-3 bg-background/90 px-3 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-4 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <p className="mb-2 hidden text-xs font-medium tracking-wide text-muted-foreground uppercase lg:block">
        Contenido
      </p>
      <ol className="flex [scrollbar-width:none] gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
        {sections.map((section, index) => (
          <li key={section.id} className="shrink-0">
            <button
              type="button"
              onClick={() =>
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
              }
              className={cn(
                CHIP,
                'transition hover:bg-muted/70 hover:text-foreground lg:w-full lg:rounded-xl lg:bg-transparent lg:px-3 lg:py-1.5 lg:text-left lg:text-sm',
              )}
            >
              {index + 1}. {section.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
