import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ShipmentChat } from './shipment-chat'

function renderChat() {
  Element.prototype.scrollIntoView = vi.fn()
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ShipmentChat />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fill = (name: string, value: string) =>
  fireEvent.change(document.querySelector(`input[name=${name}]`)!, { target: { value } })

describe('ShipmentChat', () => {
  it('no tiene caja de texto: pide los datos con un formulario', async () => {
    renderChat()
    expect(screen.getByText('Quiero hacer un envío')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mensaje para Logi' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Calcular mi envío' })).toBeInTheDocument()
  })

  it('valida los campos y, con todo correcto, muestra la cotización de /cotizar', async () => {
    renderChat()
    fireEvent.click(await screen.findByRole('button', { name: 'Calcular mi envío' }))
    expect(screen.getByText('Escribe la ciudad de origen.')).toBeInTheDocument()
    expect(screen.getByText('Escribe el peso.')).toBeInTheDocument()

    fill('origen', 'Bogotá D.C.')
    fill('destino', 'Medellín')
    fill('alto_cm', '30')
    fill('ancho_cm', '20')
    fill('largo_cm', '15')
    fill('peso_real_kg', '5')
    fill('valor_declarado_cop', '200000')
    fireEvent.click(screen.getByRole('button', { name: 'Calcular mi envío' }))

    expect(await screen.findByText('Código de tu cotización')).toBeInTheDocument()
    expect(screen.getByText(/190\.975/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Calcular mi envío' })).not.toBeInTheDocument()
  })
})
