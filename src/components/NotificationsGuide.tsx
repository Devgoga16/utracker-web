import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Building2, User, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getWorkflow } from '@/api/tenants'
import { useSubscription } from '@/hooks/useSubscription'
import { cn } from '@/lib/cn'

type Status = 'on' | 'off-plan' | 'off-phone' | 'off-states'

interface Notice {
  title: string
  when: string
  /** Si depende del plan del negocio o es un mensaje de uTracker. */
  needsPlan: boolean
  /** Si llega al WhatsApp del negocio (Ajustes → Identidad). */
  toBusiness?: boolean
}

const TO_CUSTOMER: Notice[] = [
  {
    title: 'Pedido confirmado',
    when: 'Cuando el cliente hace un pedido en tu tienda, en una campaña o desde un link de pedido. Lleva lo que pidió, el total, el adelanto, la entrega y su link de seguimiento.',
    needsPlan: true,
  },
  {
    title: 'Cambio de estado',
    when: 'Cuando el pedido llega a un estado marcado con «Notificar al cliente» en Workflow.',
    needsPlan: true,
  },
  {
    title: 'Pago confirmado',
    when: 'Cuando alguien del equipo confirma que llegó el comprobante que mandó el cliente.',
    needsPlan: true,
  },
  {
    title: 'Pago no confirmado',
    when: 'Cuando se rechaza su comprobante. Le pide que te lo vuelva a enviar.',
    needsPlan: true,
  },
]

const TO_BUSINESS: Notice[] = [
  {
    title: 'Pedido nuevo',
    when: 'Cuando entra un pedido de tu tienda, de una campaña o de un link de pedido.',
    needsPlan: true,
    toBusiness: true,
  },
  {
    title: 'Stock bajo',
    when: 'Cuando un producto baja de su umbral de aviso.',
    needsPlan: true,
    toBusiness: true,
  },
  {
    title: 'Respuesta de soporte',
    when: 'Cuando el equipo de uTracker responde uno de tus tickets.',
    needsPlan: false,
    toBusiness: true,
  },
]

const TO_TEAM: Notice[] = [
  {
    title: 'Invitación al equipo',
    when: 'Cuando invitas a alguien y pones su WhatsApp. Además le llega por correo.',
    needsPlan: false,
  },
]

const STATUS_LABEL: Record<Status, string> = {
  on: 'Activo',
  'off-plan': 'Tu plan no lo incluye',
  'off-phone': 'Falta tu WhatsApp',
  'off-states': 'Ningún estado avisa',
}

/**
 * Qué avisos salen, cuándo y a quién, con su estado real en este negocio.
 *
 * Los avisos estaban repartidos entre el plan, el WhatsApp de Identidad y una
 * casilla en cada estado del workflow. Nadie podía decir de memoria cuáles
 * estaban saliendo; aquí se ven todos juntos, y lo que falta se dice.
 *
 * Lo que no avisa también se dice: un pedido cargado a mano y las ventas del
 * punto de venta no mandan confirmación.
 */
export function NotificationsGuide({ businessPhone }: { businessPhone: string }) {
  const { can } = useSubscription()
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  const planIncludes = can('whatsappNotifications')
  const notifyingStates = (workflow?.fulfillment ?? []).filter((s) => s.notifyCustomer)
  const hasPhone = businessPhone.replace(/\D/g, '').length > 0

  const statusOf = (n: Notice): Status => {
    if (n.needsPlan && !planIncludes) return 'off-plan'
    if (n.toBusiness && !hasPhone) return 'off-phone'
    if (n.title === 'Cambio de estado' && workflow && !notifyingStates.length) return 'off-states'
    return 'on'
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white border border-slate-200">
      <header className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">Avisos por WhatsApp</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Qué mensajes salen solos, cuándo y a quién. Salen del número de uTracker, o del tuyo si
          lo conectamos.
        </p>
      </header>

      <Group icon={User} title="A tu cliente" notices={TO_CUSTOMER} statusOf={statusOf} />
      {notifyingStates.length > 0 && (
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
          Estados que avisan: {notifyingStates.map((s) => `«${s.name}»`).join(', ')}.{' '}
          <Link to="/workflow" className="font-medium text-brand-600 hover:underline">
            Cambiar en Workflow
          </Link>
        </p>
      )}
      <Group icon={Building2} title="A tu negocio (tu WhatsApp de Identidad)" notices={TO_BUSINESS} statusOf={statusOf} />
      <Group icon={UserPlus} title="A tu equipo" notices={TO_TEAM} statusOf={statusOf} />

      <p className="flex gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-500 sm:px-5">
        <Bell size={14} className="mt-0.5 shrink-0 text-slate-400" />
        No mandan mensaje: los pedidos que cargas a mano, las ventas del punto de venta, las
        cancelaciones (salvo que el estado de cancelación avise) ni las devoluciones.
      </p>
    </section>
  )
}

function Group({
  icon: Icon,
  title,
  notices,
  statusOf,
}: {
  icon: LucideIcon
  title: string
  notices: Notice[]
  statusOf: (n: Notice) => Status
}) {
  return (
    <div className="border-t border-slate-100 first-of-type:border-t-0">
      <p className="flex items-center gap-2 px-4 pt-3.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase sm:px-5">
        <Icon size={13} />
        {title}
      </p>
      <ul className="divide-y divide-slate-100">
        {notices.map((n) => {
          const status = statusOf(n)
          return (
            <li key={n.title} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-6 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.when}</p>
              </div>
              <span
                className={cn(
                  'w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  status === 'on' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700',
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
