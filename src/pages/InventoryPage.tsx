import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  History,
  Minus,
  Package,
  PackageSearch,
  Plus,
  TrendingDown,
} from 'lucide-react'
import { listInventory, adjustStock, listMovements } from '@/api/inventory'
import type { InventoryRow } from '@/api/inventory'
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionLabel,
  Spinner,
  StatStrip,
  Tabs,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { StockMovement } from '@/types'
import { useRole } from '@/hooks/useRole'
import { getWorkflow } from '@/api/tenants'
import { stockRuleText } from '@/lib/stockRule'

export function InventoryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventory,
  })

  // Para contar cuándo sale el stock con el estado real de este negocio.
  const { data: workflow } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  const [onlyAlerts, setOnlyAlerts] = useState(false)

  if (isLoading) return <Spinner />

  // El umbral ya no es un número fijo: cada producto trae el suyo.
  const products = data?.products
  const outOfStock = products?.filter((p) => (p.stock ?? 0) <= 0).length ?? 0
  const lowStock =
    products?.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= p.threshold).length ?? 0
  const stockValue =
    products?.reduce((sum, p) => sum + (p.stock ?? 0) * p.price, 0) ?? 0

  const visible = onlyAlerts
    ? products?.filter((p) => (p.stock ?? 0) <= p.threshold)
    : products

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description={
          <>
            Solo los productos con control de stock activado.{' '}
            <Link to="/catalog" className="font-medium text-brand-600 hover:underline">
              Ir al catálogo
            </Link>
          </>
        }
      />

      {error && <Alert error={error} />}

      {workflow && (
        <p className="flex gap-2 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-slate-600 border border-slate-200">
          <PackageSearch size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            {stockRuleText(workflow.fulfillment)}{' '}
            <Link to="/workflow" className="font-medium text-brand-600 hover:underline">
              Cambiarlo en Workflow
            </Link>
          </span>
        </p>
      )}

      {products?.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Ningún producto tiene control de stock"
          description='Ve al catálogo, edita un producto y activa "Control de stock" para verlo aquí.'
          action={
            <Link to="/catalog">
              <Button>Ir al catálogo</Button>
            </Link>
          }
        />
      ) : (
        <>
          <StatStrip
            stats={[
              { label: 'Productos con stock', value: String(products?.length ?? 0), hint: `Valor en stock: ${formatCurrency(stockValue)}` },
              {
                label: 'Stock bajo',
                value: String(lowStock),
                hint: lowStock > 0 ? 'Bajo el umbral de cada producto' : 'Ninguno bajo su umbral',
                tone: lowStock > 0 ? 'warn' : 'default',
              },
              {
                label: 'Sin stock',
                value: String(outOfStock),
                hint: outOfStock > 0 ? 'Requieren reposición' : 'Todo disponible',
                tone: outOfStock > 0 ? 'bad' : 'default',
              },
            ]}
          />

          <Tabs
            value={onlyAlerts ? 'alerts' : 'all'}
            onChange={(key) => setOnlyAlerts(key === 'alerts')}
            items={[
              { key: 'all', label: 'Todos', count: products?.length ?? 0 },
              { key: 'alerts', label: 'Necesitan reposición', count: lowStock + outOfStock },
            ]}
          />

          {visible?.length === 0 ? (
            <EmptyState title="Nada que reponer" description="Todos los productos tienen stock suficiente." />
          ) : (
            // Una sola lista con separadores, no una tarjeta por producto.
            <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {visible?.map((product) => (
                <ProductRow key={product._id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductRow({ product }: { product: InventoryRow }) {
  // Ajustar el stock cambia el inventario de todos: dueño y administrador.
  const { isManager } = useRole()
  const [panel, setPanel] = useState<'none' | 'adjust' | 'history'>('none')
  const queryClient = useQueryClient()

  const stock = product.stock ?? 0
  const tone = stock <= 0 ? 'red' : stock <= product.threshold ? 'amber' : 'green'

  /**
   * Proyección al ritmo real de venta. Se avisa a partir de dos semanas:
   * más allá de eso el dato no cambia ninguna decisión.
   */
  const daysLeft = product.daysLeft
  const showProjection = daysLeft !== null && daysLeft <= 14 && stock > 0

  function toggle(next: 'adjust' | 'history') {
    setPanel((p) => (p === next ? 'none' : next))
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt=""
            className="size-12 shrink-0 rounded-lg object-cover border border-slate-200"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
            <Package size={20} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{product.name}</p>
          <p className="text-xs text-slate-400">
            {formatCurrency(product.price)}
            {product.category && ` · ${product.category}`}
          </p>

          {/* Proyección: calculada del ritmo real, sin configurar nada. */}
          {showProjection && (
            <p
              className={cn(
                'mt-1 flex items-center gap-1 text-xs font-medium',
                daysLeft! <= 3 ? 'text-danger-600' : 'text-warning-600',
              )}
            >
              <TrendingDown size={11} />
              {daysLeft === 0
                ? 'Se agota hoy a este ritmo'
                : `~${daysLeft} día${daysLeft === 1 ? '' : 's'} a este ritmo`}
              <span className="font-normal text-slate-400">
                ({product.soldLastDays} vendidos en 30 días)
              </span>
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              'text-xl font-semibold tabular-nums',
              tone === 'green' && 'text-success-600',
              tone === 'amber' && 'text-warning-600',
              tone === 'red' && 'text-danger-600',
            )}
          >
            {stock}
          </p>
          <p className="text-[11px] text-slate-400">unidades</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isManager && (
            <Button
              size="sm"
              variant={panel === 'adjust' ? 'primary' : 'secondary'}
              onClick={() => toggle('adjust')}
            >
              Ajustar
            </Button>
          )}
          <button
            type="button"
            aria-label="Ver historial"
            title="Ver historial"
            onClick={() => toggle('history')}
            className={cn(
              'flex size-9 items-center justify-center rounded-lg transition-colors',
              panel === 'history'
                ? 'bg-slate-200 text-slate-800'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
            )}
          >
            <History size={15} />
          </button>
        </div>
      </div>

      {panel === 'adjust' && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <AdjustForm
            product={product}
            onDone={() => {
              setPanel('none')
              queryClient.invalidateQueries({ queryKey: ['inventory'] })
              queryClient.invalidateQueries({ queryKey: ['stock-movements', product._id] })
            }}
          />
        </div>
      )}

      {panel === 'history' && (
        <div className="border-t border-slate-100 p-4">
          <MovementHistory productId={product._id} />
        </div>
      )}
    </div>
  )
}

function AdjustForm({ product, onDone }: { product: InventoryRow; onDone: () => void }) {
  const [delta, setDelta] = useState(1)
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => adjustStock(product._id, delta, note || undefined),
    onSuccess: onDone,
  })

  const current = product.stock ?? 0
  const next = current + delta

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {mutation.isError && <Alert error={mutation.error} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-40 sm:shrink-0">
          <Field label="Cantidad" htmlFor={`delta-${product._id}`}>
            <div className="flex items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
              <button
                type="button"
                aria-label="Restar uno"
                onClick={() => setDelta((v) => v - 1)}
                className="flex size-10 shrink-0 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <Minus size={14} />
              </button>
              <input
                id={`delta-${product._id}`}
                type="number"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value))}
                className="w-full min-w-0 border-0 bg-transparent py-2 text-center text-base font-semibold tabular-nums focus:outline-none sm:text-sm"
              />
              <button
                type="button"
                aria-label="Sumar uno"
                onClick={() => setDelta((v) => v + 1)}
                className="flex size-10 shrink-0 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <Plus size={14} />
              </button>
            </div>
          </Field>
        </div>

        <div className="min-w-0 flex-1">
          <Field label="Nota (opcional)" htmlFor={`note-${product._id}`}>
            <Input
              id={`note-${product._id}`}
              placeholder="Ej. Compra a proveedor"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {delta !== 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <Badge tone={delta > 0 ? 'green' : 'amber'}>
            {delta > 0 ? 'Entrada' : 'Salida'} de {Math.abs(delta)} u.
          </Badge>
          <span className="tabular-nums">
            {current} → <strong className="text-slate-900">{next}</strong> unidades
          </span>
          {next < 0 && <span className="text-danger-600">El stock quedaría negativo.</span>}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending || delta === 0}>
          {mutation.isPending ? 'Guardando...' : 'Guardar ajuste'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function MovementHistory({ productId }: { productId: string }) {
  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: () => listMovements(productId),
  })

  if (isLoading) return <Spinner inline />

  if (!movements?.length) {
    return <p className="py-2 text-sm text-slate-400">Sin movimientos registrados.</p>
  }

  return (
    <div>
      <SectionLabel className="mb-3">Historial de movimientos</SectionLabel>
      <ul className="space-y-2.5">
        {movements.map((m) => (
          <MovementRow key={m._id} movement={m} />
        ))}
      </ul>
    </div>
  )
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const isIn = movement.delta > 0

  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          isIn ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700',
        )}
      >
        {isIn ? '+' : '−'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-slate-800">
          <span className={cn('font-semibold tabular-nums', isIn ? 'text-success-700' : 'text-danger-700')}>
            {isIn ? '+' : ''}
            {movement.delta} u.
          </span>
          <span className="text-slate-400"> · </span>
          {movement.reason === 'order' ? 'salida por pedido' : 'ajuste manual'}
          {movement.note && <span className="text-slate-500"> — {movement.note}</span>}
        </p>
        {movement.createdBy && (
          <p className="text-xs text-slate-400">por {movement.createdBy.name}</p>
        )}
      </div>

      <span className="shrink-0 text-xs whitespace-nowrap text-slate-400">
        {new Date(movement.createdAt).toLocaleDateString('es-PE')}
      </span>
    </li>
  )
}
