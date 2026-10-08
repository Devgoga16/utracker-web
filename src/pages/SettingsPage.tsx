import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, ListFilter, Plus, X } from 'lucide-react'
import { updateTenantSettings } from '@/api/tenants'
import { createCategory, deleteCategory, listCategories } from '@/api/categories'
import { apiErrorMessage } from '@/api/client'
import {
  Alert,
  Button,
  IconButton,
  Input,
  PageHeader,
  SettingGroup,
  SettingRow,
} from '@/components/ui'
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
  return days.filter((d) => d.enabled).map(({ day, open, close }) => ({ day, open, close }))
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
  const [deliveryTypes, setDeliveryTypes] = useState<string[]>(activeTenant?.deliveryTypes ?? [])
  const [deliveryFranjas, setDeliveryFranjas] = useState<string[]>(
    activeTenant?.deliveryFranjas ?? [],
  )
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    activeTenant?.paymentMethods ?? [],
  )
  const [lowStockThreshold, setLowStockThreshold] = useState(activeTenant?.lowStockThreshold ?? 5)
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
        lowStockThreshold,
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
    lowStockThreshold !== (activeTenant?.lowStockThreshold ?? 5) ||
    currentScheduleStr !== savedScheduleStr

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Ajustes" description="La configuración de tu negocio y su tienda." />

      {/* ── Identidad ──────────────────────────────────────────────── */}
      <SettingGroup title="Identidad" description="Así te ven tus clientes.">
        <SettingRow label="Logo" hint="Cuadrado, mínimo 200×200">
          <div className="flex items-center gap-3">
            <ImageUploader max={1} folder="logos" value={logoUrls} onChange={setLogoUrls} />
            {logoUrls[0] && (
              <button
                type="button"
                onClick={() => setLogoUrls([])}
                className="text-xs text-slate-400 transition-colors hover:text-red-600"
              >
                Quitar
              </button>
            )}
          </div>
        </SettingRow>

        <SettingRow label="Nombre del negocio" htmlFor="s-name">
          <Input
            id="s-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
          />
        </SettingRow>

        <SettingRow
          label="WhatsApp"
          htmlFor="s-phone"
          hint="Con código de país, sin espacios. Vacío oculta el botón en tu tienda."
        >
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
        </SettingRow>

        <SettingRow label="Color principal" hint="Tiñe tu tienda y tus campañas." wide>
          <BrandColorPicker
            value={brandColor}
            onChange={(hex) => {
              setBrandColor(hex)
              setSaved(false)
            }}
          />
        </SettingRow>
      </SettingGroup>

      {/* ── Tienda pública ─────────────────────────────────────────── */}
      <SettingGroup title="Tienda pública" description="El catálogo que compartes con tus clientes.">
        <SettingRow label="Link de tu tienda" wide>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">
              {storeUrl}
            </span>
            <IconButton label="Copiar link" onClick={copyStoreUrl} className="shrink-0">
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </IconButton>
            <a href={storeUrl} target="_blank" rel="noreferrer" className="shrink-0">
              <IconButton label="Abrir tienda">
                <ExternalLink size={15} />
              </IconButton>
            </a>
          </div>
        </SettingRow>

        <SettingRow
          label="Pedidos en línea"
          hint="Sin ninguna marcada, tu catálogo es solo vitrina: el cliente tendrá que escribirte."
        >
          <div className="space-y-2">
            {(
              [
                { v: 'pickup', label: 'Recojo en tienda' },
                { v: 'delivery_own', label: 'Delivery' },
              ] as const
            ).map((opt) => (
              <label key={opt.v} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={deliveryTypes.includes(opt.v)}
                  onChange={(e) => {
                    setDeliveryTypes((prev) =>
                      e.target.checked ? [...prev, opt.v] : prev.filter((x) => x !== opt.v),
                    )
                    setSaved(false)
                  }}
                  className="size-4 shrink-0 rounded border-slate-300 accent-brand-600"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </SettingRow>

        {deliveryTypes.includes('delivery_own') && (
          <SettingRow label="Franjas de entrega" hint="En qué momentos repartes.">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { v: 'morning', label: 'Mañana' },
                  { v: 'afternoon', label: 'Tarde' },
                  { v: 'evening', label: 'Noche' },
                ] as const
              ).map((f) => {
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
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
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
          </SettingRow>
        )}

        {deliveryTypes.length > 0 && (
          <SettingRow
            label="Métodos de pago"
            hint="Se le muestran al cliente cuando un producto pide adelanto."
            wide
          >
            <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2">Medio</th>
                    <th className="px-3 py-2">Datos</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentMethods.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-xs text-slate-400">
                        Sin métodos. No podrás cobrar adelantos.
                      </td>
                    </tr>
                  ) : (
                    paymentMethods.map((m, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">
                          <Input
                            aria-label="Medio de pago"
                            placeholder="Yape"
                            value={m.name}
                            onChange={(e) => {
                              const next = [...paymentMethods]
                              next[i] = { ...m, name: e.target.value }
                              setPaymentMethods(next)
                              setSaved(false)
                            }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            aria-label="Datos del medio"
                            placeholder="987654321 — María S."
                            value={m.details ?? ''}
                            onChange={(e) => {
                              const next = [...paymentMethods]
                              next[i] = { ...m, details: e.target.value }
                              setPaymentMethods(next)
                              setSaved(false)
                            }}
                          />
                        </td>
                        <td className="pr-2">
                          <IconButton
                            label={`Quitar ${m.name || 'método'}`}
                            onClick={() => {
                              setPaymentMethods(paymentMethods.filter((_, j) => j !== i))
                              setSaved(false)
                            }}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={15} />
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => {
                setPaymentMethods([...paymentMethods, { name: '', details: '' }])
                setSaved(false)
              }}
            >
              <Plus size={15} />
              Agregar método
            </Button>
          </SettingRow>
        )}
      </SettingGroup>

      {/* ── Horarios ───────────────────────────────────────────────── */}
      <SettingGroup title="Horarios de atención" description="Cuándo puedes atender pedidos.">
        <div className="px-4 py-1 sm:px-5">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {scheduleState.map((d) => {
                const meta = DAYS.find((x) => x.day === d.day)!
                return (
                  <tr key={d.day}>
                    <td className="py-2.5">
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={d.enabled}
                          onChange={(e) => updateDay(d.day, { enabled: e.target.checked })}
                          className="size-4 shrink-0 rounded border-slate-300 accent-brand-600"
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            d.enabled ? 'text-slate-800' : 'text-slate-400',
                          )}
                        >
                          {meta.label}
                        </span>
                      </label>
                    </td>
                    <td className="py-2.5 text-right">
                      {d.enabled ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="time"
                            aria-label={`Apertura ${meta.label}`}
                            value={d.open}
                            onChange={(e) => updateDay(d.day, { open: e.target.value })}
                            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            aria-label={`Cierre ${meta.label}`}
                            value={d.close}
                            onChange={(e) => updateDay(d.day, { close: e.target.value })}
                            className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Cerrado</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SettingGroup>

      {/* ── Catálogo ───────────────────────────────────────────────── */}
      <SettingGroup title="Catálogo" description="Cómo se organiza lo que vendes.">
        <SettingRow
          label="Categorías"
          hint="Agrupan tu catálogo en secciones. Se reutilizan al crear productos."
          wide
        >
          {categories && categories.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <span
                  key={cat._id}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 py-1 pr-1.5 pl-3 text-xs font-medium text-slate-700"
                >
                  {cat.name}
                  <button
                    type="button"
                    aria-label={`Eliminar ${cat.name}`}
                    onClick={() => deleteCatMutation.mutate(cat._id)}
                    className="rounded p-0.5 transition-colors hover:bg-slate-200 hover:text-red-600"
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
            <Button type="submit" variant="secondary" disabled={!newCatName.trim()}>
              <Plus size={15} />
            </Button>
          </form>

          {addCatMutation.isError && (
            <p className="mt-1.5 text-xs text-red-600">{apiErrorMessage(addCatMutation.error)}</p>
          )}
        </SettingRow>

        <SettingRow label="Filtros" hint="Talla, Color, Sabor… Se configuran en su propia sección.">
          <Link to="/catalog/filters">
            <Button variant="secondary" size="sm">
              <ListFilter size={15} />
              Ir a Filtros
            </Button>
          </Link>
        </SettingRow>

        <SettingRow
          label="Avisarme de stock bajo desde"
          htmlFor="s-lowstock"
          hint={
            activeTenant?.phone
              ? 'Unidades. Cada producto puede tener su propio umbral desde el catálogo.'
              : 'Sin WhatsApp configurado arriba, la alerta solo se verá en Inventario.'
          }
        >
          <Input
            id="s-lowstock"
            type="number"
            inputMode="numeric"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => {
              setLowStockThreshold(Math.max(0, Number(e.target.value) || 0))
              setSaved(false)
            }}
          />
        </SettingRow>
      </SettingGroup>

      {mutation.isError && <Alert error={mutation.error} />}

      {/* Sticky en vez de fixed: respeta el ancho del contenedor. */}
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
      {/* La paleta y el campo exacto, en una sola fila cuando entra. */}
      <div className="flex flex-wrap items-center gap-2">
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
              className={`size-7 rounded-full transition-all ${
                active
                  ? 'ring-2 ring-slate-900 ring-offset-2'
                  : 'ring-1 ring-black/10 hover:scale-110'
              }`}
            >
              {active && <Check size={13} className="mx-auto text-white drop-shadow" />}
            </button>
          )
        })}

        <span aria-hidden className="mx-1 h-6 w-px bg-slate-200" />

        <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300">
          <span className="block size-full" style={{ backgroundColor: valid ? value : '#fff' }} />
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
          className="max-w-28 font-mono text-xs"
        />
        {!valid && <span className="text-xs text-red-600">Formato: #rrggbb</span>}
      </div>

      {/* Vista previa compacta */}
      <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg ring-1 ring-slate-200">
        <div
          className="flex h-10 w-28 shrink-0 items-center justify-center text-[11px] font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${ramp[600]}, ${ramp[800]})` }}
        >
          Tu tienda
        </div>
        <span
          className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: ramp[600] }}
        >
          Pedir
        </span>
        <span
          className="rounded-md px-2 py-1 text-[11px] font-medium"
          style={{ backgroundColor: ramp[50], color: ramp[700] }}
        >
          Categoría
        </span>
      </div>
    </div>
  )
}
