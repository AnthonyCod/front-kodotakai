// Los textos de la IA (RAG) pueden arrastrar Markdown o LaTeX del manual, p. ej. `$-20^\circ\text{C}$`
// (BACKEND_CURRENT_STATE R7). Se convierten a texto legible; nunca se interpretan como HTML.

const LATEX_SYMBOLS: Record<string, string> = {
  circ: '°',
  degree: '°',
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  approx: '≈',
  rightarrow: '→',
  to: '→',
  leftarrow: '←',
  infty: '∞',
  mu: 'µ',
  alpha: 'α',
  beta: 'β',
  Delta: 'Δ',
}

// Control (salvo \n y \t), ancho cero, separadores de línea Unicode, BOM y carácter de reemplazo.
const INVISIBLE_CHARS = new RegExp(
  // oxlint-disable-next-line no-control-regex -- quitar caracteres de control es el objetivo
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u2028\\u2029\\u2060\\uFEFF\\uFFFD]',
  'g',
)

const SUPERSCRIPTS: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³' }

function latexToText(math: string): string {
  return (
    math
      // \text{C}, \mathrm{kg}, \textbf{x} → contenido
      .replace(/\\(?:text|mathrm|textbf|textit|mathbf|operatorname)\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
      .replace(/\^\s*\\circ/g, '°')
      .replace(/\^\s*\{?([0-3])\}?/g, (_, d: string) => SUPERSCRIPTS[d] ?? d)
      .replace(/\\([a-zA-Z]+)/g, (_, name: string) => LATEX_SYMBOLS[name] ?? '')
      .replace(/\\([%$&#_{}])/g, '$1')
      .replace(/\\[,;:! ]/g, ' ')
      .replace(/[{}^_]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/** Limpia un texto del backend para mostrarlo como texto plano. */
export function toPlainText(input: string): string {
  return (
    input
      // Caracteres invisibles o de control (se conservan saltos de línea y tabulaciones).
      .replace(INVISIBLE_CHARS, '')
      .replace(/\r\n?/g, '\n')
      // LaTeX en bloque o en línea: $$…$$, \[…\], \(…\), $…$
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, m: string) => latexToText(m))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m: string) => latexToText(m))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m: string) => latexToText(m))
      // $…$ solo si adentro hay LaTeX: los precios en COP también usan "$" ($190.975).
      .replace(/\$([^$\n]*?[\\^{][^$\n]*?)\$/g, (_, m: string) => latexToText(m))
      // Comandos LaTeX sueltos fuera de $…$
      .replace(/\\(?:text|mathrm|textbf|textit)\s*\{([^{}]*)\}/g, '$1')
      .replace(
        /\\(circ|times|leq|geq|pm|cdot|approx|rightarrow)\b/g,
        (_, n: string) => LATEX_SYMBOLS[n] ?? '',
      )
      // Etiquetas HTML
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      // Markdown: imágenes, enlaces, código, títulos, citas, separadores, viñetas, énfasis
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/```[a-zA-Z]*\n?/g, '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s{0,3}>\s?/gm, '')
      .replace(/^\s*([-*_])(\s*\1){2,}\s*$/gm, '')
      .replace(/^(\s*)[-*+]\s+/gm, '$1• ')
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, '$1$2')
      .replace(/(^|\W)_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1$2')
      .replace(/~~(.+?)~~/g, '$1')
      // Espacios
      .replace(/[ \t]+$/gm, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
