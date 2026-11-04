import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Calculator, ChevronDown, ChevronRight, FileText, Package, ShieldCheck } from 'lucide-react'
import { BotMessageSquare } from '@/shared/components/animate-ui/icons/hugeicons/bot-message-square'
import { GLASS } from '@/shared/ui/glass'
import { LEGAL_DOCUMENTS, UPCOMING_DOCUMENTS } from '../model/documents'
import { formatLegalDate } from '../model/format-legal-date'

const KEY_POINTS: { icon: ReactNode; text: string }[] = [
  {
    icon: <ShieldCheck size={18} aria-hidden />,
    text: 'Tus datos solo se usan para gestionar tus envíos y atenderte.',
  },
  {
    icon: <BotMessageSquare size={18} aria-hidden />,
    text: 'Logi es una IA. Si lo necesitas, un asesor humano toma tu caso.',
  },
  {
    icon: <Package size={18} aria-hidden />,
    text: 'Declara el valor real de tu envío: de él depende el seguro.',
  },
]

// (por confirmar) Respuestas en borrador, a revisar con el área legal.
const FAQS = [
  {
    question: '¿Guardan mis conversaciones con Logi?',
    answer:
      'Sí. Se guardan para atender tu caso y mejorar el servicio, y se tratan según la política de datos personales.',
  },
  {
    question: '¿Cuánto tardan en responder una solicitud sobre mis datos?',
    answer: 'Las consultas, máximo 10 días hábiles. Los reclamos, máximo 15 días hábiles.',
  },
  {
    question: '¿Puedo pedir que borren mis datos?',
    answer:
      'Sí. Hazlo desde PQRS. Solo los conservamos si una obligación legal o un envío en curso lo exige.',
  },
  {
    question: '¿Las respuestas de Logi son definitivas?',
    answer:
      'Son orientativas. El valor de un envío es el de la cotización, y un asesor puede revisar cualquier caso.',
  },
]

const SECTION_TITLE = 'text-xs font-medium tracking-wide text-muted-foreground uppercase'

/** Centro legal (`/info`): resumen, documentos, derechos y preguntas frecuentes. */
export function LegalHub() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 px-3 py-3 sm:space-y-9 sm:px-6 sm:py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium sm:text-3xl">Información legal</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Cómo cuidamos tu envío y tus datos.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>En resumen</h2>
        <ul className="space-y-3">
          {KEY_POINTS.map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
                {icon}
              </span>
              <p className="pt-1.5 text-[15px] leading-snug text-foreground/80">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <Link
        to="/info/tarifas"
        className="flex items-center gap-3 rounded-[1.25rem] bg-brand-deep p-4 text-brand-foreground shadow-card transition hover:-translate-y-0.5 active:scale-[0.99] sm:p-5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-foreground/15">
          <Calculator size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Tarifas y servicios</span>
          <span className="block text-xs text-brand-foreground/80">
            Cuánto cuesta enviar de ciudad a ciudad y adicionales.
          </span>
        </span>
        <ChevronRight size={18} aria-hidden className="shrink-0" />
      </Link>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Documentos</h2>
        <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
          {LEGAL_DOCUMENTS.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={`/info/${doc.slug}`}
                className="flex h-full items-center gap-3 rounded-[1.25rem] bg-card p-4 shadow-card transition hover:-translate-y-0.5 active:scale-[0.99]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
                  <FileText size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{doc.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    Actualizado {formatLegalDate(doc.effectiveDate)}
                  </span>
                </span>
                <ChevronRight size={18} aria-hidden className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {UPCOMING_DOCUMENTS.map((doc) => (
            <li
              key={doc.title}
              className="flex items-center gap-3 rounded-[1.25rem] border border-dashed p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <FileText size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-muted-foreground">{doc.title}</span>
                <span className="block text-xs text-muted-foreground">En preparación</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-[1.25rem] bg-muted/70 p-4 sm:p-5">
        <h2 className={SECTION_TITLE}>Tus derechos</h2>
        <p className="text-[15px] leading-snug text-foreground/80">
          Puedes conocer, actualizar, corregir o pedir que borremos tus datos.
        </p>
        <Link
          to="/consultas?herramienta=pqrs"
          className={`${GLASS} rounded-full px-4 py-2 text-sm font-medium`}
        >
          Hacer una solicitud
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Preguntas frecuentes</h2>
        <div className="divide-y rounded-[1.25rem] bg-card shadow-card">
          {FAQS.map(({ question, answer }) => (
            <details key={question} className="group px-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {question}
                <ChevronDown
                  size={18}
                  aria-hidden
                  className="shrink-0 text-muted-foreground transition group-open:rotate-180"
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-foreground/75">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t pt-4 text-xs text-muted-foreground">
        TransLogix · Razón social, NIT y dirección por confirmar.
      </footer>
    </div>
  )
}
