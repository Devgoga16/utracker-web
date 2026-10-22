import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  CheckCircle2,
  History,
  ListOrdered,
  Lock,
  Minus,
  Package,
  PenLine,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { listProducts } from '@/api/products'
import { createSale, getCurrentSession, voidSale } from '@/api/pos'
import type { CreateSaleInput } from '@/api/pos'
import { Alert, Button, Chip, ChipBar, EmptyState, Field, Input, Modal, PageHeader, Spinner } from '@/components/ui'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthStore } from '@/stores/authStore'
import { cn, formatCurrency } from '@/lib/cn'
import { round2, saleCode } from '@/lib/pos'
import type { Order, PosSale, Product } from '@/types'
import { CheckoutModal, type CheckoutResult } from './pos/CheckoutModal'
import { CloseCashModal, MovementModal, OpenCashCard } from './pos/CashControls'
import { PosTicket, type TicketData } from './pos/PosTicket'
import { SalesList } from './pos/SalesList'

interface CartLine {
  key: string
  productId?: string
  name: string
  unitPrice: number
  quantity: number
  variant?: string
  /** Para avisar si se vende más de lo que el sistema cree que hay. */
  stock?: number
}

/**
 * Punto de venta: vender en mostrador en tres toques.
 *
 * Se toca el producto, se cobra y listo. Todo lo que un pedido normal pide
 * —cliente, fecha, tipo de entrega— aquí sobra: el cliente está parado
 * enfrente y se lleva el producto en la mano.
 */
export function PosPage() {
  const { can } = useSubscription()
  const role = useAuthStore((s) => s.activeTenant?.role)

  if (!can('pos')) {
    return (
      <EmptyState
        icon={Lock}
        title="Tu plan no incluye el punto de venta"
        description="Con el punto de venta cobras en mostrador, das vuelto, imprimes ticket y cuadras la caja al cerrar."
        action={
          <Link to="/billing">
            <Button>Ver planes</Button>
          </Link>
        }
      />
    )
  }

  if (role === 'driver') {
    return (
      <EmptyState
        icon={Lock}
        title="Tu rol no cobra en mostrador"
        description="Pídele al dueño del negocio que te cambie de rol si vas a atender la caja."
      />
    )
  }

  return <PosScreen canControl={role === 'owner' || role === 'admin' || !role} />
}

function PosScreen({ canControl }: { canControl: boolean }) {
  const qc = useQueryClient()
  const { activeTenant, user } = useAuthStore()

  const { data: view, isLoading } = useQuery({
    queryKey: ['pos-session'],
    queryFn: getCurrentSession,
  })

  const [cart, setCart] = useState<CartLine[]>([])
  const [configuring, setConfiguring] = useState<Product | 'free' | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [done, setDone] = useState<{ order: Order; change: number } | null>(null)
  const [dialog, setDialog] = useState<'movement' | 'close' | 'sales' | null>(null)
  const [confirmVoid, setConfirmVoid] = useState<PosSale | null>(null)

  // Impresión: primero se monta el ticket y en el cuadro siguiente se imprime.
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [printRequest, setPrintRequest] = useState(0)
  useEffect(() => {
    if (!printRequest || !ticket) return
    const frame = requestAnimationFrame(() => window.print())
    return () => cancelAnimationFrame(frame)
  }, [printRequest, ticket])

  const print = (sale: TicketData) => {
    setTicket(sale)
    setPrintRequest((n) => n + 1)
  }

  const total = round2(cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
  const units = cart.reduce((s, l) => s + l.quantity, 0)

  const sale = useMutation({
    mutationFn: (payload: CreateSaleInput) => createSale(payload),
    onSuccess: (result) => {
      setCart([])
      setCheckingOut(false)
      setCartOpen(false)
      setDone(result)
      setTicket({ ...result.order, customer: result.order.customer })
      qc.invalidateQueries({ queryKey: ['pos-session'] })
      // Puede haber descontado stock.
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const voiding = useMutation({
    mutationFn: (id: string) => voidSale(id),
    onSuccess: () => {
      setConfirmVoid(null)
      qc.invalidateQueries({ queryKey: ['pos-session'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  function add(line: Omit<CartLine, 'quantity' | 'key'> & { key?: string }) {
    const key = line.key ?? `${line.productId}:${line.variant ?? ''}:${line.unitPrice}`
    setCart((current) => {
      const found = current.find((l) => l.key === key)
      if (found) return current.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l))
      return [...current, { ...line, key, quantity: 1 }]
    })
  }

  function pick(product: Product) {
    // Con variantes o a cotizar hace falta un dato más antes de agregarlo.
    if (product.variants.length || product.pricingMode === 'quoted') {
      setConfiguring(product)
      return
    }
    add({
      productId: product._id,
      name: product.name,
      unitPrice: product.price,
      stock: product.trackStock ? product.stock : undefined,
    })
  }

  function changeQty(key: string, delta: number) {
    setCart((current) =>
      current
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    )
  }

  function checkout(result: CheckoutResult) {
    sale.mutate({
      items: cart.map((l) => ({
        productId: l.productId,
        name: l.productId ? undefined : l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        variant: l.variant,
      })),
      ...result,
    })
  }

  if (isLoading) return <Spinner />

  const session = view?.session
  if (!session || !view?.summary) {
    return (
      <div className="space-y-6">
        <PosHeader canControl={canControl} />
        <OpenCashCard />
      </div>
    )
  }

  const cartPanel = (
    <CartPanel
      cart={cart}
      total={total}
      onQty={changeQty}
      onClear={() => setCart([])}
      onCheckout={() => setCheckingOut(true)}
    />
  )

  return (
    <div className="space-y-5">
      <PosHeader canControl={canControl} />

      {/* ── Estado de la caja ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white px-4 py-3 border border-slate-200">
        <span className="flex items-center gap-2 text-sm">
          <span className="size-2 rounded-full bg-success-500" />
          <span className="font-medium text-slate-900">Caja abierta</span>
          <span className="text-slate-400">
            desde{' '}
            {new Date(session.openedAt).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {session.openedBy?.name ? ` · ${session.openedBy.name}` : ''}
          </span>
        </span>
        <span className="text-sm text-slate-500">
          {view.summary.salesCount} {view.summary.salesCount === 1 ? 'venta' : 'ventas'} ·{' '}
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatCurrency(view.summary.salesTotal)}
          </span>
        </span>
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <Button size="sm" variant="secondary" onClick={() => setDialog('sales')}>
            <ListOrdered size={14} />
            Ventas del turno
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog('movement')}>
            <ArrowRightLeft size={14} />
            Movimiento
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog('close')}>
            <Lock size={14} />
            Cerrar caja
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ProductPicker
          onPick={pick}
          onFree={() => setConfiguring('free')}
          inCart={(id) => cart.filter((l) => l.productId === id).reduce((s, l) => s + l.quantity, 0)}
        />

        {/* Carrito fijo al costado en pantallas grandes. */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">{cartPanel}</div>
        </aside>
      </div>

      {/* Carrito en el celular: una barra encima del menú inferior. */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 lg:hidden md:bottom-3">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-navy px-4 py-3 text-left text-white shadow-float transition-transform duration-150 active:scale-[.98]"
          >
            <span className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-2 -right-2 min-w-5 rounded-full bg-brand-500 px-1 text-center text-[11px] font-semibold tabular-nums">
                {units}
              </span>
            </span>
            <span className="flex-1 text-sm font-medium">Ver carrito</span>
            <span className="text-base font-semibold tabular-nums">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      {cartOpen && (
        <Modal title="Carrito" onClose={() => setCartOpen(false)}>
          {cartPanel}
        </Modal>
      )}

      {configuring && (
        <ItemModal
          product={configuring === 'free' ? null : configuring}
          onClose={() => setConfiguring(null)}
          onAdd={(line) => {
            add(line)
            setConfiguring(null)
          }}
        />
      )}

      {checkingOut && (
        <CheckoutModal
          total={total}
          pending={sale.isPending}
          error={sale.isError ? sale.error : null}
          onConfirm={checkout}
          onClose={() => {
            sale.reset()
            setCheckingOut(false)
          }}
        />
      )}

      {done && (
        <Modal
          title="Venta registrada"
          onClose={() => setDone(null)}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => print({ ...done.order, customer: done.order.customer })}
              >
                <Printer size={15} />
                Imprimir ticket
              </Button>
              <Button autoFocus onClick={() => setDone(null)}>
                Nueva venta
              </Button>
            </>
          }
        >
          <div className="py-2 text-center">
            <CheckCircle2 size={40} className="mx-auto text-success-500" />
            <p className="mt-3 text-sm text-slate-500">
              Venta {saleCode(done.order.trackingToken)} ·{' '}
              {formatCurrency(done.order.totalAmount)}
            </p>
            {done.change > 0 && (
              <div className="mt-4 rounded-xl bg-success-50 py-4">
                <p className="text-sm font-medium text-success-800">Vuelto</p>
                <p className="text-4xl font-semibold tracking-tight text-success-700 tabular-nums">
                  {formatCurrency(done.change)}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {dialog === 'movement' && <MovementModal onClose={() => setDialog(null)} />}
      {dialog === 'close' && (
        <CloseCashModal
          openingAmount={session.openingAmount}
          summary={view.summary}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'sales' && (
        <Modal title="Ventas del turno" wide onClose={() => setDialog(null)}>
          <SalesList
            sales={view.sales}
            onReprint={(s) => print({ ...s, customer: s.customer, cashier: s.createdBy?.name })}
            onVoid={canControl ? setConfirmVoid : undefined}
            voidingId={voiding.isPending ? voiding.variables : null}
          />
        </Modal>
      )}

      {confirmVoid && (
        <Modal
          title={`¿Anular la venta ${saleCode(confirmVoid.trackingToken)}?`}
          onClose={() => {
            voiding.reset()
            setConfirmVoid(null)
          }}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmVoid(null)}>
                No, volver
              </Button>
              <Button
                variant="danger"
                disabled={voiding.isPending}
                onClick={() => voiding.mutate(confirmVoid._id)}
              >
                {voiding.isPending ? 'Anulando…' : 'Sí, anular'}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-slate-600">
            {voiding.isError && <Alert error={voiding.error} />}
            <p>
              Los productos vuelven al inventario y los{' '}
              <strong className="text-slate-900">{formatCurrency(confirmVoid.totalAmount)}</strong>{' '}
              salen del cuadre de la caja. Devuélvele el dinero al cliente.
            </p>
            <p>La venta queda en la lista como anulada.</p>
          </div>
        </Modal>
      )}

      {ticket && (
        <PosTicket
          sale={ticket}
          businessName={activeTenant?.name ?? ''}
          businessPhone={activeTenant?.phone}
          cashier={user?.name}
        />
      )}
    </div>
  )
}

function PosHeader({ canControl }: { canControl: boolean }) {
  return (
    <PageHeader
      title="Punto de venta"
      description="Cobra en mostrador y cuadra la caja al cerrar."
      actions={
        canControl && (
          <Link to="/pos/cajas">
            <Button variant="secondary">
              <History size={15} />
              Cajas anteriores
            </Button>
          </Link>
        )
      }
    />
  )
}

/* ─────────────────────────── Productos ─────────────────────────── */

function ProductPicker({
  onPick,
  onFree,
  inCart,
}: {
  onPick: (product: Product) => void
  onFree: () => void
  inCart: (productId: string) => number
}) {
  const { data: products, isLoading } = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const search = useRef<HTMLInputElement>(null)

  // «/» lleva al buscador, como en casi cualquier sistema con buscador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = useMemo(
    () => (products ?? []).filter((p) => p.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )
  const categories = useMemo(
    () => [...new Set(active.map((p) => p.category).filter((c): c is string => Boolean(c)))].sort(),
    [active],
  )

  const needle = query.trim().toLowerCase()
  const visible = active.filter(
    (p) =>
      (!category || p.category === category) &&
      (!needle || p.name.toLowerCase().includes(needle)),
  )

  return (
    <section aria-label="Productos" className="min-w-0 space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <Input
            ref={search}
            type="search"
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter con un solo resultado lo agrega: buscar y cobrar sin el mouse.
              if (e.key === 'Enter' && visible.length === 1) {
                onPick(visible[0])
                setQuery('')
              }
            }}
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={onFree}>
          <PenLine size={15} />
          <span className="hidden sm:inline">Ítem libre</span>
        </Button>
      </div>

      {categories.length > 0 && (
        <ChipBar>
          <Chip active={!category} onClick={() => setCategory(null)}>
            Todo
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </ChipBar>
      )}

      {isLoading ? (
        <Spinner />
      ) : !active.length ? (
        <EmptyState
          icon={Package}
          title="Todavía no tienes productos"
          description="Carga tu catálogo para vender con un toque, o usa «Ítem libre» para cobrar algo suelto."
          action={
            <Link to="/catalog">
              <Button variant="secondary">Ir al catálogo</Button>
            </Link>
          }
        />
      ) : !visible.length ? (
        <p className="py-10 text-center text-sm text-slate-500">Nada coincide con «{query}».</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 pb-20 sm:grid-cols-3 lg:pb-0 xl:grid-cols-4">
          {visible.map((product) => {
            const count = inCart(product._id)
            const stock = product.trackStock ? (product.stock ?? 0) : null
            return (
              <li key={product._id}>
                <button
                  type="button"
                  onClick={() => onPick(product)}
                  className={cn(
                    'focus-ring relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-white text-left ring-1 transition-[box-shadow,transform] duration-150 hover:shadow-card-hover active:scale-[.97]',
                    count ? 'ring-2 ring-brand-500' : 'ring-slate-200',
                  )}
                >
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-2xl font-semibold text-slate-300">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {count > 0 && (
                    <span className="absolute top-2 right-2 min-w-6 rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white tabular-nums shadow">
                      {count}
                    </span>
                  )}
                  <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                    <span className="line-clamp-2 text-sm leading-snug font-medium text-slate-900">
                      {product.name}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-1 pt-1">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {product.pricingMode === 'quoted' ? (
                          <span className="text-warning-600">A cotizar</span>
                        ) : (
                          formatCurrency(product.price)
                        )}
                      </span>
                      {stock !== null && (
                        <span
                          className={cn(
                            'text-[11px] font-medium tabular-nums',
                            stock <= 0 ? 'text-danger-600' : stock <= 5 ? 'text-warning-600' : 'text-slate-400',
                          )}
                        >
                          {stock <= 0 ? 'Sin stock' : `Quedan ${stock}`}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/* ─────────────────────────── Carrito ─────────────────────────── */

function CartPanel({
  cart,
  total,
  onQty,
  onClear,
  onCheckout,
}: {
  cart: CartLine[]
  total: number
  onQty: (key: string, delta: number) => void
  onClear: () => void
  onCheckout: () => void
}) {
  return (
    <div className="flex max-h-[calc(100dvh-3rem)] flex-col rounded-xl bg-white border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-900">Venta actual</p>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-danger-600"
          >
            Vaciar
          </button>
        )}
      </div>

      {!cart.length ? (
        <div className="px-4 py-12 text-center">
          <ShoppingCart size={24} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">Toca un producto para agregarlo.</p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {cart.map((line) => {
            const over = line.stock !== undefined && line.quantity > line.stock
            return (
              <li key={line.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {line.name}
                      {line.variant && <span className="text-slate-500"> · {line.variant}</span>}
                    </p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {formatCurrency(line.unitPrice)} c/u
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <QtyButton label="Quitar uno" onClick={() => onQty(line.key, -1)}>
                    {line.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                  </QtyButton>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                  <QtyButton label="Agregar uno" onClick={() => onQty(line.key, 1)}>
                    <Plus size={14} />
                  </QtyButton>
                  {over && (
                    <span className="ml-auto text-[11px] font-medium text-warning-600">
                      El sistema tiene {Math.max(0, line.stock!)}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
        <Button className="w-full py-3 text-base" disabled={!cart.length} onClick={onCheckout}>
          Cobrar
        </Button>
      </div>
    </div>
  )
}

function QtyButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-[background-color,transform] duration-150 hover:bg-slate-200 active:scale-90"
    >
      {children}
    </button>
  )
}

/* ─────────────────────────── Variante, precio o ítem libre ─────────────────────────── */

/**
 * Lo que falta saber antes de agregar: la variante, el precio de algo que se
 * cotiza, o —en un ítem libre— el nombre y el precio.
 */
function ItemModal({
  product,
  onAdd,
  onClose,
}: {
  /** null = ítem libre. */
  product: Product | null
  onAdd: (line: Omit<CartLine, 'quantity' | 'key'> & { key?: string }) => void
  onClose: () => void
}) {
  const [variant, setVariant] = useState(product?.variants[0]?.name ?? '')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  const quoted = product?.pricingMode === 'quoted'
  const free = !product
  const chosen = product?.variants.find((v) => v.name === variant)
  const unitPrice =
    free || quoted ? Number(price) : round2(product!.price + (chosen?.priceModifier ?? 0))
  const valid = unitPrice > 0 && (!free || name.trim()) && (!product?.variants.length || chosen)

  const submit = () => {
    if (!valid) return
    onAdd(
      free
        ? { key: `free:${Date.now()}`, name: name.trim(), unitPrice: round2(unitPrice) }
        : {
            productId: product._id,
            name: product.name,
            unitPrice: round2(unitPrice),
            variant: chosen?.name,
            stock: product.trackStock ? product.stock : undefined,
          },
    )
  }

  return (
    <Modal
      title={free ? 'Ítem libre' : product.name}
      description={free ? 'Algo que no está en el catálogo.' : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Agregar {unitPrice > 0 ? formatCurrency(unitPrice) : ''}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {free && (
          <Field label="Qué es" htmlFor="free-name">
            <Input id="free-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}

        {!!product?.variants.length && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Variante</legend>
            <div className="grid grid-cols-2 gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  aria-pressed={variant === v.name}
                  onClick={() => setVariant(v.name)}
                  className={cn(
                    'focus-ring rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    variant === v.name
                      ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
                  )}
                >
                  <span className="block font-medium">{v.name}</span>
                  {!quoted && (
                    <span className="text-xs text-slate-500 tabular-nums">
                      {formatCurrency(product.price + v.priceModifier)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {(free || quoted) && (
          <Field label="Precio" htmlFor="item-price">
            <Input
              id="item-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              autoFocus={!free}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        )}

        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
