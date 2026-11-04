import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import userFixtures from '@/mocks/fixtures/users.json'
import { LoginScreen } from './login-screen'
import { RequireRole } from './require-role'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginScreen /> },
      {
        path: '/admin',
        element: (
          <RequireRole role="ADMIN">
            <p>Panel admin</p>
          </RequireRole>
        ),
      },
      {
        path: '/asesor',
        element: (
          <RequireRole role="ASESOR">
            <p>Módulo asesor</p>
          </RequireRole>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const fill = (name: string, value: string) =>
  fireEvent.change(document.querySelector(`input[name=${name}]`)!, { target: { value } })

const userWith = (rol: string) => userFixtures.users.find((u) => u.rol === rol)!

describe('login y roles', () => {
  it('sin sesión manda al login y, al ingresar, vuelve a la sección', async () => {
    renderAt('/admin')
    expect(await screen.findByRole('heading', { name: 'Ingresa a tu cuenta' })).toBeInTheDocument()

    fill('email', 'admin@translogix.test')
    fill('password', 'incorrecta')
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()

    fill('password', userWith('ADMIN').password)
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Panel admin')).toBeInTheDocument()
  })

  it('con un rol menor no muestra la sección', async () => {
    renderAt('/login?next=%2Fadmin')
    fill('email', userWith('ENCARGADO').email)
    fill('password', userWith('ENCARGADO').password)
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(/necesitas el rol Administrador/)).toBeInTheDocument()
    expect(screen.queryByText('Panel admin')).not.toBeInTheDocument()
  })

  it('valida el formulario antes de enviar', async () => {
    renderAt('/login')
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()
  })

  it('la cuenta de asesor pendiente de contraseña entra con cualquiera y va a su módulo', async () => {
    renderAt('/login')
    fill('email', userWith('ASESOR').email)
    fill('password', 'cualquiera')
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Módulo asesor')).toBeInTheDocument()
  })

  it('un usuario cliente no ve el módulo del asesor', async () => {
    renderAt('/login?next=%2Fasesor')
    fill('email', userWith('USUARIO').email)
    fill('password', userWith('USUARIO').password)
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(/necesitas el rol Asesor/)).toBeInTheDocument()
  })

  it('con token del personal entra con el rol que da /auth/me', async () => {
    renderAt('/login')
    fill('email', 'revisor.demo@translogix.co')
    fill('password', 'tlxs_mockrevisor_demo')
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Módulo asesor')).toBeInTheDocument()
  })

  it('un token que el backend no reconoce no da sesión', async () => {
    renderAt('/login')
    fill('email', 'alguien@translogix.co')
    fill('password', 'tlxs_desconocido_xyz')
    fireEvent.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('Módulo asesor')).not.toBeInTheDocument()
  })
})
