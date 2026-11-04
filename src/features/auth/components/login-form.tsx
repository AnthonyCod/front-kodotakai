import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from 'cn'
import { ErrorText } from '@/shared/ui/error-text'
import { FieldError } from '@/shared/ui/field-error'
import { FIELD, FIELD_LABEL, PRIMARY_BUTTON } from '@/shared/ui/form-styles'
import type { LoginRequest, SessionUser } from '../api/auth-api'
import { parseLoginForm, type LoginErrors } from '../model/login-form'
import { useLogin } from '../model/use-session'

/** Correo y contraseña. Valida antes de enviar; el error de credenciales lo redacta el backend. */
export function LoginForm({ onSuccess }: { onSuccess: (user: SessionUser) => void }) {
  const [values, setValues] = useState<LoginRequest>({ email: '', password: '' })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const mutation = useLogin()

  function change(name: keyof LoginRequest, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    mutation.reset()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseLoginForm(values)
    if (!parsed.ok) return setErrors(parsed.errors)
    mutation.mutate(parsed.request, { onSuccess })
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className={FIELD_LABEL}>Correo</span>
        <input
          className={FIELD}
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          autoFocus
          value={values.email}
          aria-invalid={!!errors.email}
          onChange={(event) => change('email', event.target.value)}
        />
        <FieldError>{errors.email}</FieldError>
      </label>

      <label className="block space-y-1">
        <span className={FIELD_LABEL}>Contraseña</span>
        <span className="relative block">
          <input
            className={cn(FIELD, 'pr-11')}
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            value={values.password}
            aria-invalid={!!errors.password}
            onChange={(event) => change('password', event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((show) => !show)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </span>
        <FieldError>{errors.password}</FieldError>
      </label>

      <ErrorText error={mutation.error} />

      <button type="submit" disabled={mutation.isPending} className={cn(PRIMARY_BUTTON, 'w-full')}>
        {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
