import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, History, Minus, Package, PackageSearch, Plus, XCircle } from 'lucide-react'
import { listInventory, adjustStock, listMovements } from '@/api/inventory'
import { apiErrorMessage } from '@/api/client'
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SectionLabel,
  Spinner,
  StatCard,
} from '@/components/ui'
import { cn, formatCurrency } from '@/lib/cn'
import type { Product, StockMovement } from '@/types'

/** Debajo de este número el producto se marca como stock bajo. */
const LOW_STOCK_THRESHOLD = 5

export function InventoryPage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryFn: listInventory,
  })

  const [onlyAlerts, setOnlyAlerts] = useState(false)

  if (isLoading) return <Spinner />

  const outOfStock = products?.filter((p) => (p.stock ?? 0) <= 0).length ?? 0
  const lowStock =
    products?.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW_STOCK_THRESHOLD).length ?? 0
  const stockValue =
    products?.reduce((sum, p) => sum + (p.stock ?? 0) * p.price, 0) ?? 0

  const visible = onlyAlerts
    ? products?.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
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

      {error && <Alert>{apiErrorMessage(error)}</Alert>}

      {products?.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Ningún producto tiene control de stock"
          description='Ve al catálogo, edita un producto y activa "Control de stock" para verlo acá.'
          action={
            <Link to="/catalog">
              <Button>Ir al catálogo</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Package}
              label="Productos rastreados"
              value={String(products?.length ?? 0)}
              hint={`Valor en stock: ${formatCurrency(stockValue)}`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Stock bajo"
              value={String(lowStock)}
              hint={`${LOW_STOCK_THRESHOLD} unidades o menos`}
              tone={lowStock > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              icon={XCircle}
              label="Sin stock"
              value={String(outOfStock)}
              hint={outOfStock > 0 ? 'Requieren reposición' : 'Todo disponible'}
              tone={outOfStock > 0 ? 'red' : 'slate'}
            />
          </div>

          {(lowStock > 0 || outOfStock > 0) && (
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyAlerts}
                onChange={(e) => setOnlyAlerts(e.target.checked)}
                className="size-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Ver solo los que necesitan reposición
            </label>
          )}

          {visible?.length === 0 ? (
            <EmptyState title="Nada que reponer" description="Todos los productos tienen stock suficiente." />
          ) : (
            <div className="space-y-3">
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

function ProductRow({ product }: { product: Product }) {
  const [panel, setPanel] = useState<'none' | 'adjust' | 'history'>('none')
  const queryClient = useQueryClient()

  const stock = product.stock ?? 0
  const tone = stock <= 0 ? 'red' : stock <= LOW_STOCK_THRESHOLD ? 'amber' : 'green'

  function toggle(next: 'adjust' | 'history') {
    setPanel((p) => (p === next ? 'none' : next))
  }

  return (
    <Card flush>
      <div className="flex items-center gap-3 p-4">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt=""
            className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
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
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              'text-xl font-bold tabular-nums',
              tone === 'green' && 'text-emerald-600',
              tone === 'amber' && 'text-amber-600',
              tone === 'red' && 'text-red-600',
            )}
          >
            {stock}
          </p>
          <p className="text-[11px] text-slate-400">unidades</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant={panel === 'adjust' ? 'primary' : 'secondary'}
            onClick={() => toggle('adjust')}
          >
            Ajustar
          </Button>
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
    </Card>
  )
}

function AdjustForm({ product, onDone }: { product: Product; onDone: () => void }) {
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
      {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

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
          {next < 0 && <span className="text-red-600">El stock quedaría negativo.</span>}
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
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
        )}
      >
        {isIn ? '+' : '−'}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-slate-800">
          <span className={cn('font-semibold tabular-nums', isIn ? 'text-emerald-700' : 'text-red-700')}>
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
