import { describe, expect, it } from 'vitest'
import { hasRole, safeNext } from './roles'
import { parseLoginForm } from './login-form'

describe('parseLoginForm', () => {
  it('normaliza el correo y pide los dos campos', () => {
    expect(parseLoginForm({ email: '  Ana@Correo.COM ', password: 'x' })).toEqual({
      ok: true,
      request: { email: 'ana@correo.com', password: 'x' },
    })
    expect(parseLoginForm({ email: '', password: '' })).toEqual({
      ok: false,
      errors: { email: 'Escribe tu correo.', password: 'Escribe tu contraseña.' },
    })
    expect(parseLoginForm({ email: 'ana@', password: 'x' })).toMatchObject({
      errors: { email: 'Escribe un correo válido.' },
    })
  })
})

describe('roles', () => {
  const user = (rol: 'USUARIO' | 'ENCARGADO' | 'ADMIN') => ({
    id: '1',
    nombre: 'A',
    email: 'a@a.co',
    rol,
  })

  it('cada rol incluye los de abajo', () => {
    expect(hasRole(user('ADMIN'), 'ENCARGADO')).toBe(true)
    expect(hasRole(user('ENCARGADO'), 'ADMIN')).toBe(false)
    expect(hasRole(user('USUARIO'), 'USUARIO')).toBe(true)
    expect(hasRole(null, 'USUARIO')).toBe(false)
  })

  it('solo redirige a rutas internas', () => {
    expect(safeNext('/admin')).toBe('/admin')
    expect(safeNext('//otro.com')).toBe('/')
    expect(safeNext('https://otro.com')).toBe('/')
    expect(safeNext(null)).toBe('/')
  })
})
