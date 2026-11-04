import { Link } from 'react-router'
import mapaUrl from '@/assets/mapa-cobertura.webp'
import { GLASS } from '@/shared/ui/glass'
import { EmptyResult } from '@/shared/ui/metric'

/**
 * Sucursales. El backend aún no expone la lista (direcciones, horarios): se muestra la zona de
 * cobertura y se deja el listado como pendiente (por confirmar).
 */
export function BranchesOverview() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 py-3 sm:space-y-6 sm:px-6 sm:py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium sm:text-3xl">Sucursales</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Zona donde opera TransLogix.</p>
      </div>

      <img
        src={mapaUrl}
        alt="Mapa de Colombia y la región donde opera TransLogix"
        className="h-48 w-full rounded-[1.25rem] object-cover shadow-card sm:h-72 sm:rounded-[1.75rem]"
      />

      <EmptyResult>
        <div className="space-y-3">
          <p>La lista de sucursales con dirección y horario estará disponible pronto.</p>
          <Link to="/" className={`${GLASS} rounded-full px-4 py-2 text-foreground`}>
            Preguntarle a Logi
          </Link>
        </div>
      </EmptyResult>
    </div>
  )
}
