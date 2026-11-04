import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { ErrorText } from '@/shared/ui/error-text'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON, type ResultSummary } from '@/shared/ui/form-styles'
import { EmptyResult, Metric } from '@/shared/ui/metric'
import { createPqrsTicket, uploadAttachment, type PqrsTicketRequest } from '../api/pqrs-api'
import { ATTACHMENT_LIMITS, type DocumentoCodigo } from '../api/pqrs-blocks'
import { DOCUMENT_LABELS, TICKET_STATUS_LABELS, ticketNumber } from './blocks/pqrs-blocks'

const TIPOS = ['PETICION', 'QUEJA', 'RECLAMO', 'SINIESTRO'] as const
const NOVEDADES = [
  'AVERIA_APARENTE',
  'AVERIA_NO_APARENTE',
  'PERDIDA_TOTAL',
  'SAQUEO',
  'OTRO',
] as const

const TIPO_LABELS: Record<(typeof TIPOS)[number], string> = {
  PETICION: 'Petición',
  QUEJA: 'Queja',
  RECLAMO: 'Reclamo',
  SINIESTRO: 'Siniestro (daño o pérdida)',
}
const NOVEDAD_LABELS: Record<(typeof NOVEDADES)[number], string> = {
  AVERIA_APARENTE: 'Daño visible',
  AVERIA_NO_APARENTE: 'Daño no visible',
  PERDIDA_TOTAL: 'Pérdida total',
  SAQUEO: 'Saqueo',
  OTRO: 'Otro',
}

/** Consulta directa: sube adjuntos (`POST /attachments`) y crea el ticket (`POST /pqrs/crear-ticket`). */
export function PqrsForm({ onResult }: { onResult?: (result: ResultSummary) => void }) {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('PETICION')
  const [guia, setGuia] = useState('')
  const [novedad, setNovedad] = useState<(typeof NOVEDADES)[number] | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [valor, setValor] = useState('')
  const [docCode, setDocCode] = useState<DocumentoCodigo>('FACTURA_COMERCIAL')
  const [file, setFile] = useState<File | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const documentos: PqrsTicketRequest['documentos'] = []
      if (file) {
        const { attachment_id } = await uploadAttachment(file, docCode)
        documentos.push({ codigo: docCode, attachment_id })
      }
      return createPqrsTicket({
        tipo,
        numero_guia: guia || null,
        tipo_novedad: novedad || null,
        descripcion,
        valor_reclamado_cop: valor ? Math.round(Number(valor)) : null,
        documentos,
      })
    },
    onSuccess: (data) =>
      onResult?.({
        reference: `Caso ${ticketNumber(data.ticket_id)}`,
        summary: TICKET_STATUS_LABELS[data.estado] ?? data.estado,
        alert: data.faltantes.length > 0 || data.estado === 'FUERA_DE_PLAZO',
        searchKey: data.ticket_id,
      }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (
      file &&
      (file.size > ATTACHMENT_LIMITS.maxBytes ||
        !(ATTACHMENT_LIMITS.mimeTypes as readonly string[]).includes(file.type))
    )
      return
    mutation.mutate()
  }
  const data = mutation.data
  const input = FIELD

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className={input}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Guía (opcional)</span>
          <input
            value={guia}
            onChange={(e) => setGuia(e.target.value.toUpperCase().trim())}
            placeholder="TLX-123456-CO"
            className={input}
          />
        </label>
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Novedad (opcional)</span>
          <select
            value={novedad}
            onChange={(e) => setNovedad(e.target.value as typeof novedad)}
            className={input}
          >
            <option value="">—</option>
            {NOVEDADES.map((n) => (
              <option key={n} value={n}>
                {NOVEDAD_LABELS[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Valor reclamado COP (opcional)</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className={input}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={FIELD_LABEL}>Descripción</span>
          <textarea
            required
            maxLength={4000}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={input}
          />
        </label>
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Documento adjunto (opcional)</span>
          <select
            value={docCode}
            onChange={(e) => setDocCode(e.target.value as DocumentoCodigo)}
            className={input}
          >
            {Object.entries(DOCUMENT_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={FIELD_LABEL}>Archivo PDF/JPG ≤ 10 MB</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2"
          />
        </label>
        <button
          type="submit"
          disabled={mutation.isPending}
          className={`sm:col-span-2 ${PRIMARY_BUTTON}`}
        >
          {mutation.isPending ? 'Enviando…' : 'Crear ticket'}
        </button>
        <div className="sm:col-span-2">
          <ErrorText error={mutation.error} />
        </div>
      </form>

      {data ? (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground">Tu caso</p>
            <p className="text-3xl font-semibold sm:text-4xl">{ticketNumber(data.ticket_id)}</p>
            <p className="text-xs text-muted-foreground">Guárdalo para hacer seguimiento</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t pt-5">
            <Metric label="Estado" value={TICKET_STATUS_LABELS[data.estado] ?? data.estado} />
            <Metric
              label="Documentos"
              value={`${data.checklist.filter((d) => d.recibido).length} de ${data.checklist.length}`}
              hint="recibidos"
            />
          </div>
          {data.faltantes.length > 0 && (
            <p className="rounded-xl bg-warning/10 p-3 text-xs">
              Faltan: {data.faltantes.map((c) => DOCUMENT_LABELS[c]).join(', ')}
            </p>
          )}
          {data.escalamiento?.mensaje_cliente && (
            <p className="text-sm whitespace-pre-wrap">{data.escalamiento.mensaje_cliente}</p>
          )}
        </div>
      ) : (
        <EmptyResult>Describe lo que pasó y aquí verás el número de tu caso.</EmptyResult>
      )}
    </div>
  )
}
