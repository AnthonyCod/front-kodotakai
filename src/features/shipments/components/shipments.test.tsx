import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { signInMock } from '@/mocks/handlers'
import { MyShipments } from './my-shipments'

const renderUi = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

describe('mis envíos', () => {
  it('el usuario ve sus solicitudes: la aprobada con guía y la rechazada con motivo', async () => {
    signInMock('USUARIO')
    renderUi(<MyShipments />)

    expect(await screen.findByText('Aprobado')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de aprobación')).toBeInTheDocument()
    expect(screen.getByText(/TLX-\d{6}-CO/)).toBeInTheDocument()
    expect(screen.getByText(/supera el tope/)).toBeInTheDocument()
  })
})
