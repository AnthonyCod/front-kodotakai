import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Copy, Info } from 'lucide-react'
import { cn } from 'cn'
import { toApiError } from '@/shared/api'
import { ErrorText } from '@/shared/ui/error-text'
import {
  STAFF_ROLES,
  createStaffUser,
  updateStaffRoles,
  type StaffRole,
  type StaffUser,
} from '../api/staff-api'
import { useToasts } from '../model/toast-store'
import { ActionButton, Badge, Card } from './ui'

const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const

const FIELD =
  'h-11 w-full rounded-lg border bg-card px-3 text-base outline-none focus:border-primary sm:text-sm'

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: 'Administrador',
  REVIEWER: 'Asesor / revisor',
}

/** Usuarios internos (ADMIN): crear y cambiar roles. El backend no permite listarlos. */
export function AdminUsers({ myStaffId }: { myStaffId: string | null }) {
  return (
    <div className="space-y-5">
      <header className="lg:hidden">
        <h1 className="text-xl font-semibold">Usuarios internos</h1>
        <p className="text-xs text-muted-foreground">Crear usuarios y cambiar sus roles</p>
      </header>
      <p className="flex gap-2 rounded-lg bg-primary-subtle p-3 text-xs text-primary">
        <Info className="size-4 shrink-0" {...ICON} />
        El token de acceso de un usuario nuevo no sale por la API: pídelo al backend. Tampoco hay
        listado de usuarios todavía; guarda el id que devuelve la creación.
      </p>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <CreateUser />
        <ChangeRoles myStaffId={myStaffId} />
      </div>
    </div>
  )
}

function RolePicker({
  value,
  onChange,
}: {
  value: StaffRole[]
  onChange: (roles: StaffRole[]) => void
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">Roles</legend>
      <div className="flex flex-wrap gap-2">
        {STAFF_ROLES.map((role) => {
          const on = value.includes(role)
          return (
            <button
              key={role}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onChange(on ? value.filter((r) => r !== role) : [...value, role])}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition',
                on && 'border-primary bg-primary-subtle font-medium text-primary',
              )}
            >
              {on && <Check className="size-4" {...ICON} />}
              {ROLE_LABEL[role]}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function UserResult({ user }: { user: StaffUser }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Sin portapapeles: el id sigue visible.
    }
  }
  return (
    <div className="space-y-1 rounded-lg bg-muted/70 p-3 text-sm">
      <p className="font-semibold">{user.nombre}</p>
      <p className="text-xs text-muted-foreground">{user.email}</p>
      <p className="flex flex-wrap gap-1.5">
        {user.roles.map((r) => (
          <Badge key={r} tone="primary">
            {ROLE_LABEL[r as StaffRole] ?? r}
          </Badge>
        ))}
        <Badge>{user.estado}</Badge>
      </p>
      <button
        type="button"
        onClick={() => void copy()}
        className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums hover:text-foreground"
      >
        {copied ? (
          <Check className="size-3.5 text-success" {...ICON} />
        ) : (
          <Copy className="size-3.5" {...ICON} />
        )}
        id {user.id}
      </button>
    </div>
  )
}

function CreateUser() {
  const show = useToasts((s) => s.show)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [roles, setRoles] = useState<StaffRole[]>(['REVIEWER'])
  const mutation = useMutation({
    mutationFn: createStaffUser,
    onSuccess: (user) => show({ text: `Usuario ${user.email} creado` }),
  })
  const valid = /\S+@\S+\.\S+/.test(email) && nombre.trim() && roles.length > 0

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate({ email: email.trim(), nombre: nombre.trim(), roles })
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-semibold">Crear usuario</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Correo</span>
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Nombre</span>
          <input
            autoComplete="off"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={FIELD}
          />
        </label>
        <RolePicker value={roles} onChange={setRoles} />
        <ErrorText error={mutation.error} />
        <ActionButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!valid || mutation.isPending}
        >
          {mutation.isPending ? 'Creando…' : 'Crear usuario'}
        </ActionButton>
        {mutation.data && <UserResult user={mutation.data} />}
      </form>
    </Card>
  )
}

function ChangeRoles({ myStaffId }: { myStaffId: string | null }) {
  const show = useToasts((s) => s.show)
  const [userId, setUserId] = useState('')
  const [roles, setRoles] = useState<StaffRole[]>(['REVIEWER'])
  const own = !!myStaffId && userId.trim() === myStaffId
  const mutation = useMutation({
    mutationFn: () => updateStaffRoles(userId.trim(), roles),
    onSuccess: (user) => show({ text: `Roles de ${user.email} actualizados` }),
  })
  const ownRoleError = toApiError(mutation.error).status === 403
  const valid = userId.trim() && roles.length > 0 && !own

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <h2 className="font-semibold">Cambiar roles</h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Id del usuario</span>
          <input
            autoComplete="off"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Ej.: 8043876f-c144-406c-9a4e-db8f75d68682"
            className={cn(FIELD, 'tabular-nums')}
          />
        </label>
        {own && <p className="text-xs text-warning-strong">No puedes cambiar tus propios roles.</p>}
        <RolePicker value={roles} onChange={setRoles} />
        {ownRoleError ? (
          <p role="alert" className="text-sm text-destructive">
            No tienes permiso para cambiar los roles de ese usuario.
          </p>
        ) : (
          <ErrorText error={mutation.error} />
        )}
        <ActionButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!valid || mutation.isPending}
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar roles'}
        </ActionButton>
        <p className="text-xs text-muted-foreground">
          El cambio aplica desde la siguiente petición de esa persona.
        </p>
        {mutation.data && <UserResult user={mutation.data} />}
      </form>
    </Card>
  )
}
