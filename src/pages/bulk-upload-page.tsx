import { PagePlaceholder } from '@/shared/ui/page-placeholder'

/** Ruta `/carga-masiva` — subir varios envíos a la vez (por confirmar: sin endpoint en el backend). */
export function BulkUploadPage() {
  return (
    <PagePlaceholder
      title="Carga masiva"
      description="Sube varios envíos a la vez desde un archivo."
    />
  )
}
