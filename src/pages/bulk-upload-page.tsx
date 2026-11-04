import { BulkUpload } from '@/features/bulk-upload'

/** Ruta `/carga-masiva` — crear muchos envíos desde un Excel (`POST /shipment-batches`). */
export function BulkUploadPage() {
  return <BulkUpload />
}
