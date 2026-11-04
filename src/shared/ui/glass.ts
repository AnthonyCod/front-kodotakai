// Vidrio líquido solo con CSS (0 KB), estilo Apple: fondo translúcido, desenfoque, un brillo
// interior arriba en vez de borde y sombra suave. Va en píldora (`rounded-full`) en los botones.
// Para el efecto WebGL real (1-2 botones de vitrina): LiquidGlassButton.

const GLASS_BASE =
  'inline-flex items-center justify-center gap-1.5 backdrop-blur-md backdrop-saturate-150 transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45'

/** Claro: sobre fondos blancos o grises (respuestas rápidas, acciones secundarias). */
export const GLASS = `${GLASS_BASE} bg-white/65 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.95),inset_0_-1px_0_rgb(15_23_42/0.04),0_1px_2px_rgb(15_23_42/0.06),0_6px_18px_rgb(15_23_42/0.08)] hover:bg-white/85 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.95),inset_0_-1px_0_rgb(15_23_42/0.04),0_2px_4px_rgb(15_23_42/0.06),0_10px_24px_rgb(15_23_42/0.10)]`

/** Oscuro (azul Logi): la acción principal, p. ej. enviar o hablar con un asesor. */
export const GLASS_TINT = `${GLASS_BASE} bg-brand-deep/90 text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.28),inset_0_-1px_0_rgb(0_0_0/0.12),0_1px_2px_rgb(15_23_42/0.10),0_6px_18px_rgb(30_58_138/0.24)] hover:bg-brand-deep/80`

/**
 * Superficie de vidrio para barras (cabecera, barra inferior): el mismo cristal claro, más
 * desenfoque para lo que pasa por debajo y sin efecto de botón (no se encoge al tocar).
 */
export const GLASS_SURFACE =
  'bg-white/65 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgb(255_255_255/0.95),0_1px_2px_rgb(15_23_42/0.05),0_10px_30px_rgb(15_23_42/0.10)]'

/** Sobre el panel azul con degradado: vidrio blanco traslúcido y texto blanco. */
export const GLASS_ON_BRAND = `${GLASS_BASE} bg-white/15 text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_4px_12px_rgb(0_0_0/0.10)] hover:bg-white/25`
