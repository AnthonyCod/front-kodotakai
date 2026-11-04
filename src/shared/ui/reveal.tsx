import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const ELEMENTS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  aside: motion.aside,
  li: motion.li,
} as const

/**
 * Aparece con el mismo efecto que los textos (`SplitText`): opacidad, desenfoque y un leve subir.
 * Una sola vez, cuando entra en pantalla. `order` escalona varios elementos seguidos.
 * Con «reducir movimiento» se muestra sin animar.
 */
export function Reveal({
  as = 'div',
  order = 0,
  className,
  children,
  ...rest
}: {
  as?: keyof typeof ELEMENTS
  /** Posición en una serie (0, 1, 2…): cada uno espera un poco más. */
  order?: number
  className?: string
  children: ReactNode
  id?: string
  role?: string
  'aria-label'?: string
  'aria-live'?: 'polite'
  hidden?: boolean
}) {
  const reduceMotion = useReducedMotion()
  const Element = ELEMENTS[as]
  return (
    <Element
      initial={reduceMotion ? false : { opacity: 0, filter: 'blur(6px)', y: 12 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once: true, margin: '0px 0px -24px 0px' }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1], delay: Math.min(order, 8) * 0.06 }}
      className={className}
      {...rest}
    >
      {children}
    </Element>
  )
}
