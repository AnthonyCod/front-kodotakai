// Vidrio solo con CSS (0 KB): fondo translúcido, desenfoque, brillo interior arriba y sombra suave.
// Es el estilo de todos los botones. Para el efecto WebGL real (1-2 botones de vitrina): LiquidGlassButton.

const GLASS_BASE =
  'inline-flex items-center justify-center gap-1.5 border backdrop-blur-md backdrop-saturate-150 transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45'

/** Claro: sobre fondos blancos o grises (respuestas rápidas, acciones secundarias). */
export const GLASS = `${GLASS_BASE} border-white/70 bg-white/55 text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.9),inset_0_-1px_0_rgb(0_0_0/0.03),0_1px_2px_rgb(0_0_0/0.05),0_6px_16px_rgb(0_0_0/0.06)] hover:bg-white/75`

/** Oscuro (azul Logi): la acción principal, p. ej. enviar. */
export const GLASS_TINT = `${GLASS_BASE} border-white/20 bg-brand-deep/85 text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_rgb(30_58_138/0.22)] hover:bg-brand-deep/75`

/** Sobre el panel azul con degradado: vidrio blanco traslúcido y texto blanco. */
export const GLASS_ON_BRAND = `${GLASS_BASE} border-white/30 bg-white/15 text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_4px_12px_rgb(0_0_0/0.10)] hover:bg-white/25`
