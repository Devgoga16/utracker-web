import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Clock,
  Copy,
  Mail,
  MailWarning,
  Trash2,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react'
import {
  cancelInvitation,
  getTeam,
  inviteMember,
  removeMember,
  updateMember,
  type InviteResult,
} from '@/api/team'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'
import { formatDateTime } from '@/lib/cn'
import { timeAgo } from '@/lib/tickets'
import type { MembershipRole, Team, TeamInvitation, TeamMember } from '@/types'

const ROLE_TONES: Record<MembershipRole, 'brand' | 'amber' | 'slate'> = {
  owner: 'brand',
  admin: 'amber',
  staff: 'slate',
  driver: 'slate',
}

const ROLE_HINTS: Record<MembershipRole, string> = {
  owner: 'Acceso total, incluido el equipo y la suscripción.',
  admin: 'Casi todo: catálogo, workflow, ajustes. No toca la suscripción.',
  staff: 'Trabaja los pedidos del día a día.',
  driver: 'Entregas: mueve los pedidos en los estados que le habilites.',
}

/**
 * Equipo del negocio.
 *
 * Los roles no son decorativos: ya deciden qué endpoints puede llamar cada uno
 * y, en el workflow, qué estados puede mover. Sumar a un repartidor aquí es
 * darle de verdad el acceso justo.
 */
export function TeamPage() {
  const qc = useQueryClient()
  const [inviting, setInviting] = useState(false)

  const { data, isLoading, error } = useQuery({ queryKey: ['team'], queryFn: getTeam })

  if (isLoading) return <Spinner />
  if (error) return <Alert error={error} />
  if (!data) return null

  const { seats } = data
  const activeMembers = data.members.filter((m) => m.isActive)
  const hasLimitedRoles = activeMembers.some(
    (m) => m.role === 'staff' || m.role === 'driver',
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo"
        description="Quién entra a tu negocio y con qué permisos."
        actions={
          <Button disabled={seats.full} onClick={() => setInviting(true)}>
            <UserPlus size={15} />
            <span className="hidden sm:inline">Invitar</span>
            <span className="sm:hidden">Invitar</span>
          </Button>
        }
      />

      {/* Lugares del plan. Lo primero que hay que entender de esta pantalla. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Users size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeMembers.length} persona{activeMembers.length === 1 ? '' : 's'} en el equipo
                {seats.pending > 0 && (
                  <span className="font-normal text-slate-400">
                    {' '}
                    · {seats.pending} invitación{seats.pending === 1 ? '' : 'es'} pendiente
                    {seats.pending === 1 ? '' : 's'}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                {seats.limit === 0
                  ? 'Tu plan no tiene límite de personas.'
                  : `Tu plan permite ${seats.limit}. Te ${
                      seats.available === 1 ? 'queda' : 'quedan'
                    } ${seats.available}.`}
              </p>
            </div>
          </div>

          {seats.full && (
            <Badge tone="amber">
              <MailWarning size={11} />
              Sin lugares libres
            </Badge>
          )}
        </div>

        {seats.full && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Para sumar a alguien más, cancela una invitación pendiente, desactiva a alguien que ya
            no trabaja contigo, o sube de plan.
          </p>
        )}
      </Card>

      {!data.emailEnabled && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <MailWarning size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <span>
            El envío de correos no está configurado en el servidor, así que la invitación no sale
            por mail. Igual te vamos a dar el enlace para que lo mandes por WhatsApp.
          </span>
        </div>
      )}

      <MembersList members={data.members} roles={data.roles} />

      {/*
        Los estados del workflow traen habilitados solo dueño y administrador.
        Sin este aviso, invitar a un repartidor y verlo sin poder mover nada
        parece un error del sistema, cuando es un permiso que falta marcar.
      */}
      {hasLimitedRoles && (
        <div className="flex flex-wrap items-start gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-200">
          <Workflow size={16} className="mt-0.5 shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1">
            Tienes gente con rol de personal o repartidor. Para que puedan mover pedidos de estado,
            habilita su rol en cada estado del workflow: por defecto solo pueden el dueño y los
            administradores.
          </span>
          <Link to="/workflow" className="shrink-0">
            <Button size="sm" variant="secondary">
              Ir al workflow
            </Button>
          </Link>
        </div>
      )}

      {data.invitations.length > 0 && (
        <InvitationsList invitations={data.invitations} />
      )}

      {inviting && (
        <InviteDialog
          team={data}
          onClose={() => setInviting(false)}
          onInvited={() => qc.invalidateQueries({ queryKey: ['team'] })}
        />
      )}
    </div>
  )
}

function MembersList({
  members,
  roles,
}: {
  members: TeamMember[]
  roles: Team['roles']
}) {
  const qc = useQueryClient()
  const [removing, setRemoving] = useState<TeamMember | null>(null)

  const patch = useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: MembershipRole; isActive?: boolean }) =>
      updateMember(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team'] })
      setRemoving(null)
    },
  })

  return (
    <>
      {patch.isError && <Alert error={patch.error} />}
      {remove.isError && <Alert error={remove.error} />}

      <Card title="Personas" flush>
        {/* Tabla en desktop, tarjetas en mobile. */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
                <th className="px-4 py-2.5">Persona</th>
                <th className="px-4 py-2.5">Rol</th>
                <th className="px-4 py-2.5">Desde</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m._id} className={m.isActive ? undefined : 'bg-slate-50/60'}>
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      {m.user?.name ?? 'Usuario eliminado'}
                      {m.isMe && <Badge tone="slate">Tú</Badge>}
                      {!m.isActive && <Badge tone="red">Desactivado</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">{m.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect
                      member={m}
                      roles={roles}
                      disabled={patch.isPending}
                      onChange={(role) => patch.mutate({ id: m._id, role })}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{timeAgo(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <MemberActions
                      member={m}
                      pending={patch.isPending}
                      onToggle={() => patch.mutate({ id: m._id, isActive: !m.isActive })}
                      onRemove={() => setRemoving(m)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-100 lg:hidden">
          {members.map((m) => (
            <li key={m._id} className={`p-4 ${m.isActive ? '' : 'bg-slate-50/60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    <span className="truncate">{m.user?.name ?? 'Usuario eliminado'}</span>
                    {m.isMe && <Badge tone="slate">Tú</Badge>}
                    {!m.isActive && <Badge tone="red">Desactivado</Badge>}
                  </p>
                  <p className="truncate text-sm text-slate-500">{m.user?.email}</p>
                </div>
                <Badge tone={ROLE_TONES[m.role]}>
                  {roles.find((r) => r.value === m.role)?.label ?? m.role}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <RoleSelect
                  member={m}
                  roles={roles}
                  disabled={patch.isPending}
                  onChange={(role) => patch.mutate({ id: m._id, role })}
                />
                <MemberActions
                  member={m}
                  pending={patch.isPending}
                  onToggle={() => patch.mutate({ id: m._id, isActive: !m.isActive })}
                  onRemove={() => setRemoving(m)}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {removing && (
        <Modal
          title="Quitar del equipo"
          description={removing.user?.name ?? undefined}
          onClose={() => setRemoving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRemoving(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(removing._id)}
              >
                {remove.isPending ? 'Quitando…' : 'Quitar'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Pierde el acceso a este negocio al instante. Su cuenta de uTracker sigue existiendo y
            los pedidos que cargó quedan como están.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Si es algo temporal, mejor <strong>desactivalo</strong>: le saca el acceso y te libera
            el lugar, pero conserva su rol para cuando vuelva.
          </p>
        </Modal>
      )}
    </>
  )
}

function RoleSelect({
  member,
  roles,
  disabled,
  onChange,
}: {
  member: TeamMember
  roles: Team['roles']
  disabled?: boolean
  onChange: (role: MembershipRole) => void
}) {
  // El propio rol no se toca: bajárselo es perder el acceso con el que trabajas.
  if (member.isMe) {
    return (
      <Badge tone={ROLE_TONES[member.role]}>
        {roles.find((r) => r.value === member.role)?.label ?? member.role}
      </Badge>
    )
  }

  return (
    <Select
      className="w-auto"
      value={member.role}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MembershipRole)}
    >
      {roles.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </Select>
  )
}

function MemberActions({
  member,
  pending,
  onToggle,
  onRemove,
}: {
  member: TeamMember
  pending: boolean
  onToggle: () => void
  onRemove: () => void
}) {
  if (member.isMe) return null

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={onToggle}>
        {member.isActive ? 'Desactivar' : 'Reactivar'}
      </Button>
      <button
        type="button"
        aria-label="Quitar del equipo"
        title="Quitar del equipo"
        onClick={onRemove}
        className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

function InvitationsList({ invitations }: { invitations: TeamInvitation[] }) {
  const qc = useQueryClient()
  const [copied, setCopied] = useState<string | null>(null)

  const cancel = useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })

  async function copy(invitation: TeamInvitation) {
    try {
      await navigator.clipboard.writeText(invitation.url)
      setCopied(invitation._id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Sin permiso de portapapeles: el link se ve igual debajo.
    }
  }

  return (
    <Card title="Invitaciones pendientes" description="Vencen solas si nadie las acepta." flush>
      {cancel.isError && (
        <div className="px-4 pt-4">
          <Alert error={cancel.error} />
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {invitations.map((i) => (
          <li key={i._id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  <Mail size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{i.email}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <Badge tone="slate">{i.role}</Badge>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    vence {formatDateTime(i.expiresAt)}
                  </span>
                  {i.invitedBy?.name && <span>· la mandó {i.invitedBy.name}</span>}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => copy(i)}>
                  {copied === i._id ? <Check size={14} /> : <Copy size={14} />}
                  {copied === i._id ? 'Copiado' : 'Copiar link'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(i._id)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function InviteDialog({
  team,
  onClose,
  onInvited,
}: {
  team: Team
  onClose: () => void
  onInvited: () => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MembershipRole>('staff')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const invite = useMutation({
    mutationFn: () =>
      inviteMember({ email: email.trim(), role, phone: phone.trim() || undefined }),
    onSuccess: (res) => {
      setResult(res)
      onInvited()
    },
  })

  async function copyLink() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* el link se ve igual debajo */
    }
  }

  /* Ya se mandó: se muestra por dónde salió y el link como respaldo. */
  if (result) {
    return (
      <Modal
        title="Invitación enviada"
        description={result.invitation.email}
        onClose={onClose}
        footer={<Button onClick={onClose}>Listo</Button>}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            <div className="text-sm text-emerald-900">
              {result.emailSent ? (
                <p>Le llegó un correo con el enlace para entrar.</p>
              ) : (
                <p>
                  El correo no salió, así que pásale el enlace tú. La invitación ya está creada y
                  funciona igual.
                </p>
              )}
              {result.whatsappSent && <p className="mt-1">También se le mandó por WhatsApp.</p>}
            </div>
          </div>

          <Field label="Enlace de la invitación" hint="Vence en unos días y es de un solo uso.">
            <div className="flex gap-2">
              <Input readOnly value={result.url} onFocus={(e) => e.currentTarget.select()} />
              <Button variant="secondary" onClick={copyLink}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
              </Button>
            </div>
          </Field>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Invitar a alguien"
      description="Le llega un correo con el enlace para entrar."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!email.trim() || invite.isPending} onClick={() => invite.mutate()}>
            <UserPlus size={15} />
            {invite.isPending ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {invite.isError && <Alert error={invite.error} />}

        <Field
          label="Correo"
          htmlFor="invite-email"
          hint="Va a ser su usuario para entrar a uTracker."
        >
          <Input
            id="invite-email"
            type="email"
            autoFocus
            value={email}
            placeholder="maria@ejemplo.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field label="Rol" htmlFor="invite-role" hint={ROLE_HINTS[role]}>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as MembershipRole)}
          >
            {team.roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="WhatsApp (opcional)"
          htmlFor="invite-phone"
          hint="Si lo pones, además le mandamos el enlace por ahí."
        >
          <Input
            id="invite-phone"
            value={phone}
            placeholder="987654321"
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
