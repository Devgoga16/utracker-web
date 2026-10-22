import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, KeyRound, Search, Users } from 'lucide-react'
import { listAdminUsers } from '@/api/superadmin'
import { ChangeEmailDialog, ResetPasswordDialog, type AccountTarget } from '@/components/UserAccountDialogs'
import { Alert, Badge, Button, EmptyState, Input, PageHeader, Spinner } from '@/components/ui'
import { formatDateTime } from '@/lib/cn'
import type { AdminUser, MembershipRole } from '@/types'

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Dueño',
  admin: 'Admin',
  staff: 'Personal',
  driver: 'Repartidor',
}

type Action = { kind: 'email' | 'password'; user: AccountTarget }

/**
 * Cuentas de personas, no de negocios: para cuando alguien escribe «no puedo
 * entrar» o «me equivoqué de correo». Se busca por nombre o correo.
 */
export function SuperadminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [action, setAction] = useState<Action | null>(null)

  // Espera a que se deje de escribir para no consultar por cada letra.
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['superadmin-users', q],
    queryFn: () => listAdminUsers(q),
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['superadmin-users'] })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        count={users?.length}
        description="Corrige el correo de una cuenta o dale una contraseña temporal."
      />

      <div className="relative max-w-md">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar usuarios"
        />
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <Alert error={error} />
      ) : !users?.length ? (
        <EmptyState
          icon={Users}
          title={q ? 'Nadie con ese nombre o correo' : 'Todavía no hay usuarios'}
          description={q ? 'Prueba con una parte del correo.' : undefined}
        />
      ) : (
        <>
          {users.length === 50 && (
            <p className="text-xs text-slate-500">Se muestran los 50 más recientes. Busca para afinar.</p>
          )}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {users.map((u) => (
              <UserRow key={u._id} user={u} onAction={(kind) => setAction({ kind, user: u })} />
            ))}
          </ul>
        </>
      )}

      {action?.kind === 'email' && (
        <ChangeEmailDialog user={action.user} onClose={() => setAction(null)} onDone={refresh} />
      )}
      {action?.kind === 'password' && (
        <ResetPasswordDialog user={action.user} onClose={() => setAction(null)} onDone={refresh} />
      )}
    </div>
  )
}

function UserRow({ user, onAction }: { user: AdminUser; onAction: (kind: Action['kind']) => void }) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium text-slate-900">{user.name}</p>
          {user.isSuperAdmin && <Badge tone="info">Superadmin</Badge>}
          {!user.isActive && <Badge tone="danger">Inactivo</Badge>}
          {user.mustChangePassword && (
            <Badge tone="warning" dot>
              Debe cambiar contraseña
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {user.tenants.length === 0 ? (
            <span className="text-slate-400">Sin negocios</span>
          ) : (
            user.tenants.map((t) => (
              <Link
                key={t._id}
                to={`/superadmin/tenants/${t._id}`}
                className="hover:text-slate-900 hover:underline"
              >
                {t.name} · {ROLE_LABELS[t.role] ?? t.role}
                {!t.isActive && ' (inactivo)'}
              </Link>
            ))
          )}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Desde {formatDateTime(user.createdAt)}
          {user.passwordChangedAt && ` · contraseña cambiada ${formatDateTime(user.passwordChangedAt)}`}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" onClick={() => onAction('email')}>
          <AtSign size={14} />
          Correo
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAction('password')}>
          <KeyRound size={14} />
          Contraseña temporal
        </Button>
      </div>
    </li>
  )
}
