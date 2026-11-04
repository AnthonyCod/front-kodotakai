import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { signInMock } from '@/mocks/handlers'
import { TariffAdmin } from './tariff-admin'
import { TariffSheet } from './tariff-sheet'

const renderUi = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

describe('tarifas', () => {
  it('muestra las rutas desde Bogotá con mínimo, kg y detalle de la matriz', async () => {
    renderUi(<TariffSheet />)

    const medellin = (await screen.findByText('TLX-BOG-MED-001')).closest('li')!
    expect(within(medellin).getByText('Medellín')).toBeInTheDocument()
    expect(within(medellin).getByText(/\$\s?18\.200/)).toBeInTheDocument()
    expect(within(medellin).getByText(/\$\s?3\.400 por kg/)).toBeInTheDocument()
    expect(screen.getByText(/sobre el flete base, según el trayecto/)).toBeInTheDocument()
  })

  it('el admin edita la tarifa por kg y la valida', async () => {
    signInMock('ADMIN')
    renderUi(<TariffAdmin />)

    const route = (await screen.findByText('TLX-BOG-MED-001', { exact: false })).closest('li')!
    fireEvent.click(within(route).getByRole('button', { name: 'Editar' }))
    const kg = route.querySelector<HTMLInputElement>('input[name=tarifa_kg_real_cop]')!
    expect(route.querySelector('input[name=origen]')).toBeDisabled()

    fireEvent.change(kg, { target: { value: 'abc' } })
    fireEvent.click(within(route).getByRole('button', { name: 'Guardar cambios' }))
    expect(within(route).getByRole('alert')).toHaveTextContent('Escribe un número.')

    fireEvent.change(kg, { target: { value: '3600' } })
    fireEvent.click(within(route).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(route).findByText(/\$\s?3\.600 por kg/)).toBeInTheDocument()
  })
})
