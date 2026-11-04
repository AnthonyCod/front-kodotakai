import { GLASS, GLASS_SURFACE, GLASS_TINT } from './glass'

// Estilo de las pestañas del cliente (chat, Rastrear, Sucursales, Carga masiva, Info), estilo
// Apple: títulos sobrios, superficies blancas sin borde con sombra suave, botones de vidrio líquido
// en píldora y un solo acento (la marca). Sin degradados.

export const PAGE_TITLE = 'text-xl font-semibold tracking-tight sm:text-2xl'
export const PAGE_SUBTITLE = 'text-sm text-muted-foreground'

/** Tarjeta o panel: blanco, sin borde y con sombra suave. */
export const SURFACE =
  'rounded-2xl bg-card shadow-[0_1px_2px_rgb(15_23_42/0.05),0_6px_20px_rgb(15_23_42/0.06)]'

/** Divisor punteado entre el contenido de una tarjeta y su pie. */
export const CARD_DIVIDER = 'border-t border-dashed border-border'

/** Rótulo pequeño de una sección («Detalles», «Documentos»…). */
export const SECTION_LABEL = 'text-xs font-medium text-muted-foreground'

/** Pestañas en una píldora de vidrio; la elegida en blanco (`aria-selected` o `aria-pressed`). */
export const SEGMENTED = `${GLASS_SURFACE} flex gap-1 overflow-x-auto rounded-full p-1`
export const SEGMENT =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-muted-foreground transition hover:text-foreground aria-selected:bg-card aria-selected:font-medium aria-selected:text-foreground aria-selected:shadow-card aria-pressed:bg-card aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:shadow-card'

/** Botón principal: vidrio azul Logi en píldora. */
export const PRIMARY_PILL = `${GLASS_TINT} rounded-full px-4 py-2 text-[13px] font-medium`

/** Botón secundario: vidrio claro en píldora. */
export const SECONDARY_PILL = `${GLASS} rounded-full px-3.5 py-1.5 text-[13px]`

/** Botón redondo solo con icono (necesita `aria-label`). */
export const ICON_PILL = `${GLASS} size-9 shrink-0 rounded-full text-foreground/75 hover:text-foreground`
