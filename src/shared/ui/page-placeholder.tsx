import { Link } from 'react-router'
import { GLASS } from '@/shared/ui/glass'
import { EmptyResult } from '@/shared/ui/metric'

/** Sección reservada: título y aviso mientras se define su contenido (por confirmar). */
export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-3 sm:space-y-6 sm:px-6 sm:py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
      <EmptyResult>
        <div className="space-y-3">
          <p>Esta sección estará disponible pronto.</p>
          <Link to="/" className={`${GLASS} rounded-full px-4 py-2 text-foreground`}>
            Preguntarle a Logi
          </Link>
        </div>
      </EmptyResult>
    </div>
  )
}
