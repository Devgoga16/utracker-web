export type MembershipRole = 'owner' | 'admin' | 'staff' | 'driver'
export type Franja = 'morning' | 'afternoon' | 'evening'

export interface DaySchedule {
  day: number // 0=Dom, 1=Lun … 6=Sab
  open: string // "09:00"
  close: string // "18:00"
}

export interface ScheduledFor {
  date: string // "2026-08-20"
  /** Opcional: se puede agendar el día sin partirlo en franjas. */
  franja?: Franja
}
export type WorkflowKind = 'fulfillment' | 'payment'
export type OrderType = 'pickup' | 'delivery_third_party' | 'delivery_own'
export type OrderCreatedVia = 'manual' | 'order_link' | 'store'
export type OrderLinkStatus = 'pending' | 'used' | 'expired' | 'cancelled'
export type OrderLinkDeliveryType = OrderType | 'customer_choice'

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin?: boolean
}

export type SubscriptionStatus = 'trial' | 'active' | 'suspended'
export type BillStatus = 'pending' | 'reviewing' | 'paid' | 'overdue'
export type CampaignStatus = 'draft' | 'active' | 'ended' | 'cancelled'

export interface CampaignItem {
  product: string
  name: string
  price: number
  imageUrl?: string
  stock: number
  sold: number
}

export type CampaignDeliveryType = 'pickup' | 'delivery_own'

export interface Campaign {
  _id: string
  tenant: string
  token: string
  name: string
  description?: string
  startDate: string
  endDate: string
  items: CampaignItem[]
  deliveryTypes: CampaignDeliveryType[]
  schedule?: { franjas: Franja[] }
  status: CampaignStatus
  createdAt: string
  updatedAt: string
}

export interface Bill {
  _id: string
  tenant: string | { _id: string; name: string; slug: string }
  period: string // "2026-08"
  planName: string
  amount: number
  dueDate: string
  status: BillStatus
  proofImageUrl?: string
  proofUploadedAt?: string
  paidAt?: string
  notes?: string
  createdAt: string
}

export interface PlanFeatures {
  maxOrdersPerMonth: number
  maxCatalogItems: number
  maxMembers: number
  maxWorkflowStates: number
  workflowCustomization: boolean
  publicOrderLinks: boolean
  imageUploads: boolean
  deliveryTypes: boolean
  publicTracking: boolean
  advancePayments: boolean
  inventory: boolean
  finances: boolean
}

export interface Plan {
  _id: string
  name: string
  description?: string
  price: number
  features: PlanFeatures
  isActive: boolean
  createdAt: string
}

export interface Subscription {
  _id: string
  tenant: string
  plan: Plan
  status: SubscriptionStatus
  expiresAt?: string
  notes?: string
  createdAt: string
}

export interface Category {
  _id: string
  tenant: string
  name: string
  createdAt: string
}

export interface Tenant {
  _id: string
  name: string
  slug: string
  logoUrl?: string
  /** Solo dígitos con código de país, ej. 51987654321. */
  phone?: string
  /** Hex "#rrggbb". Tiñe la tienda pública y las campañas. */
  brandColor?: string
  /** Horario de atención. No confundir con las franjas de delivery. */
  schedule?: DaySchedule[]
  /** Entregas que acepta la tienda. Vacío = no se puede comprar en línea. */
  deliveryTypes?: CampaignDeliveryType[]
  /** Franjas en las que reparte, cuando acepta delivery. */
  deliveryFranjas?: Franja[]
  /** Dónde pagar el adelanto. Se muestran tal cual en el checkout. */
  paymentMethods?: PaymentMethod[]
  /** Umbral por defecto de stock bajo, para productos sin uno propio. */
  lowStockThreshold?: number
  isActive: boolean
  role?: MembershipRole
  /**
   * Presente solo cuando se entró con un acceso de soporte, no por membresía.
   * El panel lo usa para avisar que se está mirando un negocio ajeno.
   */
  support?: { canWrite: boolean; expiresAt: string; reason: string }
}

/** Un medio de pago del negocio: "Yape al 987654321 — María S." */
export interface PaymentMethod {
  name: string
  details?: string
  qrImageUrl?: string
}

export interface ProductVariant {
  name: string
  priceModifier: number
}

export type CatalogKind = 'product' | 'service'
/** 'quoted': `price` is a reference only; the real one is agreed per order. */
export type PricingMode = 'fixed' | 'quoted'

/** Filtro configurable del catálogo: "Talla" con valores S, M, L. */
export interface ProductFilter {
  _id: string
  tenant: string
  name: string
  values: string[]
  position: number
  createdAt: string
  updatedAt: string
}

/** Valores que un producto tiene para un filtro. Lista: puede tener varios. */
export interface ProductAttribute {
  filter: string
  values: string[]
}

export interface Product {
  _id: string
  tenant: string
  kind: CatalogKind
  pricingMode: PricingMode
  name: string
  description?: string
  price: number
  images: string[]
  category?: string
  attributes: ProductAttribute[]
  variants: ProductVariant[]
  /** Días que toma tenerlo listo. 0 = recojo inmediato. */
  preparationDays: number
  /** Si al pedirlo hay que dejar un adelanto. */
  requiresAdvance: boolean
  /** 'percent' = % del subtotal de la línea; 'fixed' = soles por unidad. */
  advanceType: 'fixed' | 'percent'
  advanceValue: number
  stock?: number
  trackStock: boolean
  /** Desde cuántas unidades avisar. Sin valor, se usa el del negocio. */
  lowStockThreshold?: number
  /** Filtro al que corresponden las variantes de este producto. */
  variantFilter?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerAddress {
  label?: string
  address: string
  reference?: string
}

export interface Customer {
  _id: string
  tenant: string
  name: string
  phone: string
  email?: string
  addresses: CustomerAddress[]
}

export interface WorkflowState {
  _id: string
  tenant: string
  kind: WorkflowKind
  name: string
  color: string
  icon?: string
  position: number
  isInitial: boolean
  isFinal: boolean
  isCancellation: boolean
  notifyCustomer: boolean
  vibrant: boolean
  requiresLink: boolean
  deductsStock: boolean
  /** Tipos de entrega a los que aplica. Vacío = a todos. */
  appliesTo: OrderType[]
  allowedRoles: MembershipRole[]
}

export interface OrderItem {
  /** Absent on ad-hoc lines. */
  product?: string
  name: string
  unitPrice: number
  quantity: number
  variant?: string
  specs?: string
}

export interface DeliveryAttempt {
  attemptedAt: string
  succeeded: boolean
  reason?: string
  note?: string
}

export interface DeliveryInfo {
  address?: string
  reference?: string
  courierName?: string
  trackingCode?: string
  driver?: string
  attempts: DeliveryAttempt[]
  maxAttempts: number
}

export type PaymentKind = 'advance' | 'balance'

export interface PaymentEntry {
  kind: PaymentKind
  amount: number
  proofImageUrl?: string
  note?: string
  /** false mientras el negocio no confirme que el dinero llegó. */
  validated: boolean
  validatedAt?: string
  registeredAt: string
  registeredBy?: string
}

/** Display data is frozen at transition time — editing the workflow later never rewrites it. */
export interface StateHistoryEntry {
  kind: WorkflowKind
  state: string
  stateName: string
  stateColor: string
  stateIcon?: string
  changedAt: string
  changedBy?: string
}

export interface Order {
  _id: string
  tenant: string
  trackingToken: string
  customer: Customer
  items: OrderItem[]
  totalAmount: number
  type: OrderType
  delivery?: DeliveryInfo
  fulfillmentState: WorkflowState
  paymentState: WorkflowState
  stateHistory: StateHistoryEntry[]
  payments: PaymentEntry[]
  createdVia: OrderCreatedVia
  orderLink?: string
  campaign?: string
  fulfillmentLink?: string
  scheduledFor?: ScheduledFor
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface OrderLink {
  _id: string
  tenant: string
  token: string
  items: { product: string; quantity: number; variant?: string }[]
  deliveryType: OrderLinkDeliveryType
  status: OrderLinkStatus
  expiresAt: string
  resultingOrder?: string
  createdAt: string
}

export interface Workflow {
  fulfillment: WorkflowState[]
  payment: WorkflowState[]
}

export type StockMovementReason = 'order' | 'adjustment'

export interface StockMovement {
  _id: string
  tenant: string
  product: string
  order?: { _id: string; trackingToken: string; createdAt: string }
  delta: number
  reason: StockMovementReason
  note?: string
  createdBy?: { _id: string; name: string; email: string }
  createdAt: string
}

export interface FinanceSummary {
  totalRevenue: number
  totalCollected: number
  totalPending: number
  orderCount: number
  avgOrderValue: number
  topProducts: { productId: string; name: string; revenue: number; quantity: number }[]
}

/* ─────────────────────────── Soporte ─────────────────────────── */

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TicketCategory = 'error' | 'question' | 'billing' | 'feature' | 'other'

export interface TicketMessage {
  author?: string
  authorName: string
  /** true = lo escribió soporte; false = el negocio. */
  fromSupport: boolean
  body: string
  attachments?: string[]
  createdAt: string
}

/** Lo que el navegador sabía cuando se rompió: se arma solo, nadie lo copia a mano. */
export interface TicketContext {
  url?: string
  userAgent?: string
  appVersion?: string
  /** Código del log de la API correspondiente. */
  logRef?: string
  recentErrors?: string[]
}

export interface Ticket {
  _id: string
  code: string
  tenant?: string | { _id: string; name: string; slug: string; phone?: string }
  createdBy?: string
  createdByName: string
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  assignedTo?: string | { _id: string; name: string }
  messages: TicketMessage[]
  context?: TicketContext
  unreadForSupport: boolean
  unreadForTenant: boolean
  lastMessageAt: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
}

export type LogLevel = 'error' | 'warn' | 'info'
export type LogSource = 'api' | 'web' | 'whatsapp' | 'storefront' | 'support' | 'job'

export interface SystemLog {
  _id: string
  /** Código corto que también ve el usuario que sufrió el error. */
  ref: string
  level: LogLevel
  source: LogSource
  message: string
  action?: string
  statusCode?: number
  tenant?: { _id: string; name: string; slug: string } | null
  user?: { _id: string; name: string; email: string } | null
  stack?: string
  context?: Record<string, unknown>
  createdAt: string
}

export interface SupportAccess {
  _id: string
  tenant: string | { _id: string; name: string; slug: string }
  user: string | { _id: string; name: string; email: string }
  reason: string
  canWrite: boolean
  expiresAt: string
  revokedAt?: string
  createdAt: string
}
