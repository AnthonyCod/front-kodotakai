/**
 * Columnas de la plantilla de carga masiva, en orden. `key` es el campo del JSON del lote.
 * (por confirmar) Los datos del paquete son los de `CotizacionRequest`; `referencia_cliente` y el
 * destinatario los propone el frontend hasta que el backend defina su endpoint de lotes.
 */
export const BULK_COLUMNS = [
  {
    key: 'referencia_cliente',
    hint: 'Tu número de pedido. Único en el archivo.',
    header: 'Referencia cliente',
    example: 'PED-1001',
    width: 18,
  },
  {
    key: 'origen',
    hint: 'Ciudad de recogida.',
    header: 'Origen',
    example: 'Bogotá D.C.',
    width: 16,
  },
  { key: 'destino', hint: 'Ciudad de entrega.', header: 'Destino', example: 'Medellín', width: 16 },
  { key: 'alto_cm', hint: 'Número mayor que 0.', header: 'Alto (cm)', example: 30, width: 10 },
  { key: 'ancho_cm', hint: 'Número mayor que 0.', header: 'Ancho (cm)', example: 20, width: 10 },
  { key: 'largo_cm', hint: 'Número mayor que 0.', header: 'Largo (cm)', example: 15, width: 10 },
  { key: 'peso_real_kg', hint: 'Número mayor que 0.', header: 'Peso (kg)', example: 5, width: 10 },
  {
    key: 'valor_declarado_cop',
    hint: 'Pesos, sin puntos. Define el seguro.',
    header: 'Valor declarado (COP)',
    example: 200000,
    width: 20,
  },
  {
    key: 'requiere_cadena_frio',
    hint: 'SI o NO.',
    header: 'Cadena de frío (SI/NO)',
    example: 'NO',
    width: 20,
  },
  {
    key: 'mercancia_peligrosa',
    hint: 'SI o NO.',
    header: 'Mercancía peligrosa (SI/NO)',
    example: 'NO',
    width: 24,
  },
  {
    key: 'destinatario_nombre',
    hint: 'Quién recibe.',
    header: 'Destinatario',
    example: 'Ana Pérez',
    width: 20,
  },
  {
    key: 'destinatario_telefono',
    hint: '7 a 10 dígitos.',
    header: 'Teléfono destinatario',
    example: '3001234567',
    width: 20,
  },
  {
    key: 'destinatario_direccion',
    hint: 'Dirección completa de entrega.',
    header: 'Dirección destinatario',
    example: 'Cra 43A # 1-50',
    width: 26,
  },
] as const

export type BulkColumnKey = (typeof BULK_COLUMNS)[number]['key']

/** Límite por archivo para revisar en el navegador sin trabarlo. (por confirmar con backend) */
export const MAX_ROWS = 500
