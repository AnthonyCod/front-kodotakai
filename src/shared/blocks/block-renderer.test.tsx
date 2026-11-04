import { render, screen } from '@testing-library/react'
import { z } from 'zod'
import { BlockRenderer } from './block-renderer'
import { BlockRegistryProvider, createBlockRegistry } from './block-registry'
import { defineBlock } from './block-definition'

const probeBlock = defineBlock({
  type: 'probe',
  schema: z.object({ type: z.literal('probe'), label: z.string() }),
  Component: ({ block }) => <pre data-testid="probe">{JSON.stringify(block)}</pre>,
})

function renderBlock(block: { type: string } & Record<string, unknown>) {
  return render(
    <BlockRegistryProvider registry={createBlockRegistry([probeBlock])}>
      <BlockRenderer block={block} />
    </BlockRegistryProvider>,
  )
}

describe('BlockRenderer', () => {
  it('descarta los campos que no están en el schema (p. ej. datos personales)', () => {
    renderBlock({ type: 'probe', label: 'ok', phone: '3001234567' })
    expect(screen.getByTestId('probe')).toHaveTextContent('{"type":"probe","label":"ok"}')
  })

  it('no renderiza bloques sin componente registrado', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBlock({ type: 'unknown' })
    expect(container).toBeEmptyDOMElement()
  })

  it('no renderiza bloques fuera de contrato', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderBlock({ type: 'probe' })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('createBlockRegistry', () => {
  it('rechaza tipos duplicados', () => {
    expect(() => createBlockRegistry([probeBlock, probeBlock])).toThrow(/duplicado/)
  })
})
