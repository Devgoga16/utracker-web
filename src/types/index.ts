export type MembershipRole = 'owner' | 'admin' | 'staff' | 'driver'
export type Franja = 'morning' | 'afternoon' | 'evening'

export interface DaySchedule {
  day: number // 0=Dom, 1=Lun … 6=Sab
  open: string // "09:00"
  close: string // "18:00"
}

export interface ScheduledFor {
  date: string // "2026-08-20"
  franja: Franja
}
export type WorkflowKind = 'fulfillment' | 'payment'
export type OrderType = 'pickup' | 'delivery_third_party' | 'delivery_own'
export type OrderCreatedVia = 'manual' | 'order_link'
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
  schedule?: DaySchedule[]
  isActive: boolean
  role?: MembershipRole
}

export interface ProductVariant {
  name: string
  priceModifier: number
}

export type CatalogKind = 'product' | 'service'
/** 'quoted': `price` is a reference only; the real one is agreed per order. */
export type PricingMode = 'fixed' | 'quoted'

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
  variants: ProductVariant[]
  stock?: number
  trackStock: boolean
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
