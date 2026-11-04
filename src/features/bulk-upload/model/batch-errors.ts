/** Códigos de error por ítem del lote (`ItemError.code`) en palabras del usuario. */
const ITEM_ERROR: Record<string, string> = {
  VALIDACION: 'Hay un dato inválido',
  REFERENCIA_DUPLICADA: 'Esa referencia ya se usó en este u otro lote',
  CIUDAD_NO_RECONOCIDA: 'No reconocemos la ciudad',
  CIUDAD_NO_CUBIERTA: 'Todavía no llegamos a esa ciudad',
  TARIFA_NO_DISPONIBLE: 'No hay tarifa para esa ruta',
  SERVICIO_NO_DISPONIBLE: 'El destino no tiene ese servicio (p. ej. cadena de frío)',
  ERROR_INTERNO: 'No pudimos crearlo; vuelve a enviar el lote',
}

export const itemErrorText = (code: string, field: string | null) =>
  `${ITEM_ERROR[code] ?? 'No se pudo crear'}${field ? ` (${field})` : ''}.`
