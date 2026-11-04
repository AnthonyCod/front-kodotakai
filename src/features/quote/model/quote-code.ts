/** Código corto para que el cliente identifique su cotización (como "Caso XXXXXXXX" en PQRS). */
export const quoteCode = (cotizacionId: string) => `COT-${cotizacionId.slice(0, 8).toUpperCase()}`
