import {
  Ban,
  Bell,
  Bike,
  Banknote,
  Box,
  Cake,
  Calendar,
  Car,
  ChefHat,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  ClipboardList,
  Clock,
  Coffee,
  Coins,
  CreditCard,
  FileText,
  Flame,
  Gift,
  Hammer,
  HandPlatter,
  Hourglass,
  House,
  Inbox,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  PackageOpen,
  Percent,
  Phone,
  Plane,
  Receipt,
  Refrigerator,
  Scissors,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Truck,
  Undo2,
  User,
  Utensils,
  Wallet,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

// Curated set for order workflows. Names are stored in the DB, so treat them as
// a stable contract -- rename here only alongside a data migration.
export const ICON_GROUPS: { label: string; icons: Record<string, LucideIcon> }[] = [
  {
    label: 'Estado',
    icons: {
      inbox: Inbox,
      'clipboard-list': ClipboardList,
      'file-text': FileText,
      'circle-check': CircleCheck,
      'circle-x': CircleX,
      'circle-alert': CircleAlert,
      'circle-dashed': CircleDashed,
      clock: Clock,
      hourglass: Hourglass,
      ban: Ban,
    },
  },
  {
    label: 'Preparación',
    icons: {
      package: Package,
      'package-open': PackageOpen,
      box: Box,
      'chef-hat': ChefHat,
      utensils: Utensils,
      flame: Flame,
      refrigerator: Refrigerator,
      hammer: Hammer,
      wrench: Wrench,
      scissors: Scissors,
      shirt: Shirt,
      cake: Cake,
      coffee: Coffee,
    },
  },
  {
    label: 'Entrega',
    icons: {
      truck: Truck,
      bike: Bike,
      car: Car,
      plane: Plane,
      ship: Ship,
      'map-pin': MapPin,
      navigation: Navigation,
      house: House,
      store: Store,
      warehouse: Warehouse,
      'hand-platter': HandPlatter,
    },
  },
  {
    label: 'Pago',
    icons: {
      banknote: Banknote,
      'credit-card': CreditCard,
      wallet: Wallet,
      coins: Coins,
      receipt: Receipt,
      percent: Percent,
      'undo-2': Undo2,
    },
  },
  {
    label: 'Otros',
    icons: {
      user: User,
      phone: Phone,
      mail: Mail,
      'message-circle': MessageCircle,
      calendar: Calendar,
      bell: Bell,
      tag: Tag,
      gift: Gift,
      'shopping-bag': ShoppingBag,
      'shopping-cart': ShoppingCart,
      star: Star,
      'thumbs-up': ThumbsUp,
      sparkles: Sparkles,
    },
  },
]

export const ICONS: Record<string, LucideIcon> = Object.assign(
  {},
  ...ICON_GROUPS.map((group) => group.icons),
)

export const ICON_NAMES = Object.keys(ICONS)

export function getIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || CircleDashed
}

interface StateIconProps {
  name?: string
  size?: number
  className?: string
  color?: string
}

/** Renders a workflow state icon by its stored name, falling back to a neutral placeholder. */
export function StateIcon({ name, size = 16, className, color }: StateIconProps) {
  const Icon = getIcon(name)
  return <Icon size={size} className={className} color={color} strokeWidth={2} aria-hidden />
}
