import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { CasesBoard } from './cases-board'
import { DangerousGoodsReview } from './dangerous-goods'

function renderWith(ui: ReactNode) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('bandeja de casos real (embudo B)', () => {
  it('muestra la cola y permite tomar un caso', async () => {
    renderWith(<CasesBoard selectedCase={null} onFunnelChange={() => {}} onOpenCase={() => {}} />)
    const queue = await screen.findByRole('region', { name: 'Escalados por IA (cola)' })
    expect(await within(queue).findByText('Escalado a Supervisor')).toBeInTheDocument()

    fireEvent.click(within(queue).getByRole('button', { name: 'Tomar caso' }))
    const inProgress = screen.getByRole('region', { name: 'En gestión humana' })
    expect(await within(inProgress).findByText('Escalado a Supervisor')).toBeInTheDocument()
  })
})

describe('mercancía peligrosa', () => {
  it('el revisor registra la decisión con observaciones', async () => {
    renderWith(<DangerousGoodsReview canDecide />)
    expect(await screen.findByText('TLX-200001-CO')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Observaciones'), {
      target: { value: 'MSDS vigente y embalaje UN verificado.' },
    })
    fireEvent.click(screen.getByRole('radio', { name: 'Aprobar' }))
    fireEvent.click(screen.getByRole('button', { name: /Registrar decisión/ }))
    expect(await screen.findByText('Nada pendiente de revisión')).toBeInTheDocument()
  })

  it('sin rol de revisor solo consulta', async () => {
    renderWith(<DangerousGoodsReview canDecide={false} />)
    expect(await screen.findByText('TLX-200001-CO')).toBeInTheDocument()
    expect(screen.queryByLabelText('Observaciones')).not.toBeInTheDocument()
  })
})
