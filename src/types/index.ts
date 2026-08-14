export type MembershipRole = 'owner' | 'admin' | 'staff' | 'driver'
export type WorkflowKind = 'fulfillment' | 'payment'
export type OrderType = 'pickup' | 'delivery_third_party' | 'delivery_own'
export type OrderCreatedVia = 'manual' | 'order_link'
export type OrderLinkStatus = 'pending' | 'used' | 'expired' | 'cancelled'
export type OrderLinkDeliveryType = OrderType | 'customer_choice'

export interface User {
  id: string
  name: string
  email: string
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
