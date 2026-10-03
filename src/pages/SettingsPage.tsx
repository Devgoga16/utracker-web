import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, ListFilter, Plus, X } from 'lucide-react'
import { updateTenantSettings } from '@/api/tenants'
import { createCategory, deleteCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, IconButton, Input, PageHeader } from '@/components/ui'
import { ImageUploader } from '@/components/ImageUploader'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/cn'
import { BRAND_PRESETS, DEFAULT_BRAND, buildBrandRamp, isValidHex } from '@/lib/brandColor'
import type { DaySchedule, PaymentMethod } from '@/types'

type ScheduleDay = { day: number; enabled: boolean; open: string; close: string }

const DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Lunes' },
  { day: 2, label: 'Martes' },
  { day: 3, label: 'Miércoles' },
  { day: 4, label: 'Jueves' },
  { day: 5, label: 'Viernes' },
  { day: 6, label: 'Sábado' },
  { day: 0, label: 'Domingo' },
]

function initSchedule(saved?: DaySchedule[]): ScheduleDay[] {
  return DAYS.map(({ day }) => {
    const found = saved?.find((d) => d.day === day)
    return { day, enabled: !!found, open: found?.open ?? '09:00', close: found?.close ?? '18:00' }
  })
}

function scheduleToPayload(days: ScheduleDay[]): DaySchedule[] {
  return days
    .filter((d) => d.enabled)
    .map(({ day, open, close }) => ({ day, open, close }))
}

export function SettingsPage() {
  const { activeTenant, setActiveTenant } = useAuthStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState(activeTenant?.name ?? '')
  const [phone, setPhone] = useState(activeTenant?.phone ?? '')
  const [logoUrls, setLogoUrls] = useState<string[]>(
    activeTenant?.logoUrl ? [activeTenant.logoUrl] : [],
  )
  const [brandColor, setBrandColor] = useState(activeTenant?.brandColor ?? DEFAULT_BRAND)
  const [deliveryTypes, setDeliveryTypes] = useState<string[]>(
    activeTenant?.deliveryTypes ?? [],
  )
  const [deliveryFranjas, setDeliveryFranjas] = useState<string[]>(
    activeTenant?.deliveryFranjas ?? [],
  )
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    activeTenant?.paymentMethods ?? [],
  )
  const [scheduleState, setScheduleState] = useState<ScheduleDay[]>(() =>
    initSchedule(activeTenant?.schedule),
  )
  const [saved, setSaved] = useState(false)

  function updateDay(day: number, patch: Partial<ScheduleDay>) {
    setScheduleState((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)))
    setSaved(false)
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateTenantSettings({
        name: name.trim() || undefined,
        logoUrl: logoUrls[0] ?? null,
        phone: phone.replace(/\D/g, '') || null,
        brandColor: isValidHex(brandColor) ? brandColor.toLowerCase() : null,
        schedule: scheduleToPayload(scheduleState),
        deliveryTypes,
        deliveryFranjas,
        paymentMethods: paymentMethods.filter((m) => m.name.trim()),
      }),
    onSuccess: (tenant) => {
      setActiveTenant({ ...activeTenant!, ...tenant })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const storeUrl = `${window.location.origin}/store/${activeTenant?.slug}`
  const [copied, setCopied] = useState(false)
  function copyStoreUrl() {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const [newCatName, setNewCatName] = useState('')

  const addCatMutation = useMutation({
    mutationFn: () => createCategory(newCatName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setNewCatName('')
    },
  })

  const deleteCatMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })

  const savedScheduleStr = JSON.stringify(
    (activeTenant?.schedule ?? []).slice().sort((a, b) => a.day - b.day),
  )
  const currentScheduleStr = JSON.stringify(
    scheduleToPayload(scheduleState).sort((a, b) => a.day - b.day),
  )

  const dirty =
    name.trim() !== (activeTenant?.name ?? '') ||
    (logoUrls[0] ?? null) !== (activeTenant?.logoUrl ?? null) ||
    phone.replace(/\D/g, '') !== (activeTenant?.phone ?? '') ||
    brandColor.toLowerCase() !== (activeTenant?.brandColor ?? DEFAULT_BRAND) ||
    JSON.stringify([...deliveryTypes].sort()) !==
      JSON.stringify([...(activeTenant?.deliveryTypes ?? [])].sort()) ||
    JSON.stringify([...deliveryFranjas].sort()) !==
      JSON.stringify([...(activeTenant?.deliveryFranjas ?? [])].sort()) ||
    JSON.stringify(paymentMethods) !== JSON.stringify(activeTenant?.paymentMethods ?? []) ||
    currentScheduleStr !== savedScheduleStr

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Ajustes" description="La identidad de tu negocio y su tienda pública." />

      <Card
        title="Identidad"
        description="Así te ven tus clientes en la tienda y en el seguimiento de sus pedidos."
      >
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Logo</span>
            <ImageUploader max={1} folder="logos" value={logoUrls} onChange={setLogoUrls} />
            {logoUrls[0] && (
              <button
                type="button"
                onClick={() => setLogoUrls([])}
                className="mt-2 text-xs text-slate-400 transition-colors hover:text-red-600"
              >
                Quitar logo
              </button>
            )}
          </div>

          <Field label="Nombre del negocio" htmlFor="s-name">
            <Input
              id="s-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setSaved(false)
              }}
            />
          </Field>

          <Field label="WhatsApp del negocio" htmlFor="s-phone">
            <Input
              id="s-phone"
              type="tel"
              inputMode="tel"
              placeholder="51987654321"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setSaved(false)
              }}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Con código de país y sin espacios. Tus clientes lo usan para consultarte desde la
              tienda; si lo dejas vacío, el botón no aparece.
            </p>
          </Field>

          <BrandColorPicker
            value={brandColor}
            onChange={(hex) => {
              setBrandColor(hex)
              setSaved(false)
            }}
          />
        </div>
      </Card>

      <Card
        title="Tienda pública"
        description="Comparte este link para que tus clientes vean tu catálogo."
      >
        <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          <p className="font-mono text-xs break-all text-slate-600">{storeUrl}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyStoreUrl}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <a href={storeUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost">
              <ExternalLink size={15} />
              Ver tienda
            </Button>
          </a>
        </div>
      </Card>

      <Card
        title="Pedidos desde la tienda"
        description="Define si tus clientes pueden comprar directo desde tu catálogo, sin pasar por WhatsApp."
      >
        <div className="space-y-5">
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Formas de entrega que aceptas
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {([
                { v: 'pickup', label: 'Recojo en tienda', hint: 'El cliente va a buscarlo' },
                { v: 'delivery_own', label: 'Delivery', hint: 'Tú lo llevas a su dirección' },
              ] as const).map((opt) => {
                const on = deliveryTypes.includes(opt.v)
                return (
                  <label
                    key={opt.v}
                    className={cn(
                      'flex cursor-pointer items-start gap-2.5 rounded-xl p-3.5 ring-1 transition-colors',
                      on ? 'bg-brand-50 ring-brand-400' : 'bg-white ring-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        setDeliveryTypes((prev) =>
                          e.target.checked ? [...prev, opt.v] : prev.filter((x) => x !== opt.v),
                        )
                        setSaved(false)
                      }}
                      className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-brand-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{opt.label}</span>
                      <span className="block text-xs text-slate-500">{opt.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Las franjas solo tienen sentido si hay delivery. */}
          {deliveryTypes.includes('delivery_own') && (
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Franjas en las que repartes
              </span>
              <div className="flex flex-wrap gap-2">
                {([
                  { v: 'morning', label: 'Mañana' },
                  { v: 'afternoon', label: 'Tarde' },
                  { v: 'evening', label: 'Noche' },
                ] as const).map((f) => {
                  const on = deliveryFranjas.includes(f.v)
                  return (
                    <button
                      key={f.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setDeliveryFranjas((prev) =>
                          on ? prev.filter((x) => x !== f.v) : [...prev, f.v],
                        )
                        setSaved(false)
                      }}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        on
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                      )}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
              {deliveryFranjas.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Sin franjas el cliente no podrá elegir horario de entrega.
                </p>
              )}
            </div>
          )}

          {/* Los métodos de pago solo sirven si se puede comprar en línea. */}
          {deliveryTypes.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <span className="block text-sm font-medium text-slate-700">Métodos de pago</span>
              <p className="mt-0.5 mb-3 text-xs text-slate-500">
                Se le muestran al cliente cuando un producto pide adelanto, para que sepa dónde
                depositar. Sin ninguno no podrás cobrar adelantos.
              </p>

              {paymentMethods.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {paymentMethods.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200"
                    >
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[9rem_1fr]">
                        <Input
                          aria-label="Nombre del método"
                          placeholder="Yape"
                          value={m.name}
                          onChange={(e) => {
                            const next = [...paymentMethods]
                            next[i] = { ...m, name: e.target.value }
                            setPaymentMethods(next)
                            setSaved(false)
                          }}
                        />
                        <Input
                          aria-label="Datos del método"
                          placeholder="987654321 — María S."
                          value={m.details ?? ''}
                          onChange={(e) => {
                            const next = [...paymentMethods]
                            next[i] = { ...m, details: e.target.value }
                            setPaymentMethods(next)
                            setSaved(false)
                          }}
                        />
                      </div>
                      <IconButton
                        label={`Quitar ${m.name || 'método'}`}
                        onClick={() => {
                          setPaymentMethods(paymentMethods.filter((_, j) => j !== i))
                          setSaved(false)
                        }}
                        className="shrink-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={15} />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPaymentMethods([...paymentMethods, { name: '', details: '' }])
                  setSaved(false)
                }}
              >
                <Plus size={15} />
                Agregar método
              </Button>
            </div>
          )}

          <p
            className={cn(
              'rounded-lg px-3.5 py-3 text-xs',
              deliveryTypes.length === 0
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
            )}
          >
            {deliveryTypes.length === 0
              ? 'Sin ninguna marcada, tu catálogo funciona solo como vitrina: el cliente tendrá que escribirte por WhatsApp para pedir.'
              : 'Tus clientes pueden armar su pedido en el catálogo y confirmarlo solos. Te llega por WhatsApp y aparece en Pedidos.'}
          </p>
        </div>
      </Card>

      <Card
        title="Horarios de atención"
        description="Indica cuándo puedes atender pedidos. La franja de entrega se muestra al crear un pedido."
      >
        <ul className="divide-y divide-slate-100">
          {scheduleState.map((d) => {
            const meta = DAYS.find((x) => x.day === d.day)!
            return (
              <li key={d.day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={(e) => updateDay(d.day, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 accent-brand-600"
                  />
                  <span className="w-24 text-sm font-medium text-slate-700">{meta.label}</span>
                </label>

                {d.enabled ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={d.open}
                      onChange={(e) => updateDay(d.day, { open: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                    <span className="text-slate-400">—</span>
                    <input
                      type="time"
                      value={d.close}
                      min={d.open}
                      onChange={(e) => updateDay(d.day, { close: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Cerrado</span>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Card
        title="Categorías del catálogo"
        description="Defínelas una vez y reutilízalas al crear o editar productos."
      >
        {categories && categories.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat._id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1.5 pl-3 text-xs font-medium text-slate-700"
              >
                {cat.name}
                <button
                  type="button"
                  aria-label={`Eliminar ${cat.name}`}
                  onClick={() => deleteCatMutation.mutate(cat._id)}
                  className="rounded-full p-1 transition-colors hover:bg-slate-200 hover:text-red-600"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (newCatName.trim()) addCatMutation.mutate()
          }}
        >
          <Input
            placeholder="Nueva categoría..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
          />
          <IconButton
            label="Agregar categoría"
            onClick={() => newCatName.trim() && addCatMutation.mutate()}
            className="ring-1 ring-slate-300 hover:bg-slate-50 hover:text-brand-600"
          >
            <Plus size={16} />
          </IconButton>
        </form>

        {addCatMutation.isError && (
          <p className="mt-2 text-xs text-red-600">{apiErrorMessage(addCatMutation.error)}</p>
        )}

        {/* Los filtros viven en su propia sección; acá solo el puntero. */}
        <Link
          to="/catalog/filters"
          className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-white hover:ring-brand-400"
        >
          <ListFilter size={15} className="shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            ¿Buscas <strong className="font-medium text-slate-800">Talla</strong>,{' '}
            <strong className="font-medium text-slate-800">Color</strong> o{' '}
            <strong className="font-medium text-slate-800">Sabor</strong>? Eso se configura en
            Filtros.
          </span>
          <ExternalLink size={14} className="shrink-0 text-slate-400" />
        </Link>
      </Card>

      {mutation.isError && <Alert>{apiErrorMessage(mutation.error)}</Alert>}

      {/* Sticky en vez de fixed: así respeta el ancho del contenedor y no
          hay que replicar el ancho del sidebar, que puede estar contraído. */}
      {(dirty || saved) && (
        <div className="sticky bottom-4 z-20">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 shadow-lg shadow-slate-900/20">
            {saved && !dirty ? (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <Check size={16} />
                Cambios guardados
              </p>
            ) : (
              <>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  Tienes cambios sin guardar
                </p>
                <Button
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="shrink-0"
                >
                  {mutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── Color de marca ─────────────────────── */

function BrandColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (hex: string) => void
}) {
  const ramp = buildBrandRamp(value)
  const valid = isValidHex(value)

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Color principal</span>
      <p className="mb-3 text-xs text-slate-500">
        Tiñe tu tienda pública y tus campañas. Elige uno o pega tu color exacto.
      </p>

      {/* Paleta */}
      <div className="flex flex-wrap gap-2">
        {BRAND_PRESETS.map((p) => {
          const active = value.toLowerCase() === p.hex
          return (
            <button
              key={p.hex}
              type="button"
              title={p.name}
              aria-label={p.name}
              onClick={() => onChange(p.hex)}
              style={{ backgroundColor: p.hex }}
              className={`size-9 rounded-full transition-all ${
                active
                  ? 'ring-2 ring-slate-900 ring-offset-2'
                  : 'ring-1 ring-black/10 hover:scale-110'
              }`}
            >
              {active && <Check size={15} className="mx-auto text-white drop-shadow" />}
            </button>
          )
        })}
      </div>

      {/* Color exacto */}
      <div className="mt-3 flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-slate-300">
          <span
            className="block size-full"
            style={{ backgroundColor: valid ? value : '#ffffff' }}
          />
          <input
            type="color"
            value={valid ? value : DEFAULT_BRAND}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <Input
          aria-label="Color en hexadecimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#4f46e5"
          className="max-w-32 font-mono"
        />
        {!valid && <span className="text-xs text-red-600">Formato: #rrggbb</span>}
      </div>

      {/* Vista previa */}
      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-slate-200">
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{
            background: `linear-gradient(135deg, ${ramp[700]}, ${ramp[900]})`,
          }}
        >
          <span className="text-sm font-semibold text-white">Así se verá tu tienda</span>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <span
            className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: ramp[600] }}
          >
            Pedir ahora
          </span>
          <span
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: ramp[50], color: ramp[700] }}
          >
            Categoría
          </span>
          <div className="ml-auto flex gap-1">
            {[300, 500, 700].map((s) => (
              <span
                key={s}
                className="size-5 rounded-full ring-1 ring-black/5"
                style={{ backgroundColor: ramp[s] }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
