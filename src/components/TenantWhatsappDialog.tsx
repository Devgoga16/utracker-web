import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Send, Server, Smartphone, X } from 'lucide-react'
import {
  getTenantWhatsapp,
  setTenantWhatsapp,
  sendWhatsappTest,
  type TenantRow,
} from '@/api/superadmin'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Field, IconButton, Input, Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * Elige por qué sesión de WhatsApp manda un negocio.
 *
 * Es decisión comercial, no del dueño: una sesión propia manda desde su número
 * pero cuesta más, así que la configura el superadmin tras acordarlo.
 */
export function TenantWhatsappDialog({
  tenant,
  onClose,
}: {
  tenant: TenantRow
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-whatsapp', tenant._id],
    queryFn: () => getTenantWhatsapp(tenant._id),
  })

  const [mode, setMode] = useState<'shared' | 'own'>('shared')
  const [sendUrl, setSendUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [testPhone, setTestPhone] = useState('')

  // Al cargar, refleja lo que ya está guardado.
  useEffect(() => {
    if (!data) return
    setMode(data.mode)
    setSendUrl(data.sendUrl ?? '')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      setTenantWhatsapp(tenant._id, {
        sendUrl: mode === 'own' ? sendUrl.trim() : null,
        apiKey: mode === 'own' ? apiKey.trim() : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-whatsapp', tenant._id] })
      setApiKey('')
    },
  })

  const test = useMutation({
    mutationFn: () => sendWhatsappTest({ to: testPhone, tenantId: tenant._id }),
  })

  /**
   * Con sesión propia ya guardada, la key puede quedar vacía: significa
   * "no la cambies". Si todavía no hay ninguna, es obligatoria.
   */
  const hasSavedKey = data?.mode === 'own'
  const canSave =
    mode === 'shared' ||
    (sendUrl.trim().startsWith('http') && (apiKey.trim().length > 0 || hasSavedKey))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`WhatsApp de ${tenant.name}`}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900">WhatsApp</h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{tenant.name}</p>
          </div>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {save.isError && <Alert>{apiErrorMessage(save.error)}</Alert>}

              {/* Elección de sesión */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    {
                      v: 'shared' as const,
                      icon: Server,
                      label: 'Bot de uTracker',
                      hint: 'Compartido. Sin costo extra.',
                    },
                    {
                      v: 'own' as const,
                      icon: Smartphone,
                      label: 'Sesión propia',
                      hint: 'Manda desde su número.',
                    },
                  ]
                ).map((opt) => {
                  const active = mode === opt.v
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setMode(opt.v)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-xl border-2 p-3.5 text-left transition-all',
                        active
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <opt.icon
                        size={18}
                        className={active ? 'text-brand-600' : 'text-slate-400'}
                      />
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          active ? 'text-brand-800' : 'text-slate-800',
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="text-xs text-slate-500">{opt.hint}</span>
                    </button>
                  )
                })}
              </div>

              {mode === 'own' && (
                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                  <Field label="URL de envío" htmlFor="wa-url">
                    <Input
                      id="wa-url"
                      placeholder="https://api-ws-unify.../api/sessions/mi-sesion/send"
                      value={sendUrl}
                      onChange={(e) => setSendUrl(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      La URL completa del POST, con la sesión incluida.
                    </p>
                  </Field>

                  <Field label="API key" htmlFor="wa-key">
                    <Input
                      id="wa-key"
                      type="password"
                      autoComplete="off"
                      placeholder={
                        hasSavedKey ? `Guardada (…${data?.keyHint}) — deja vacío para no cambiarla` : 'eab4e41ac712…'
                      }
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </Field>
                </div>
              )}

              {mode === 'shared' && (
                <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
                  Las notificaciones de este negocio saldrán por el bot compartido de uTracker,
                  configurado en las variables del servidor.
                </p>
              )}

              {save.isSuccess && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <Check size={15} />
                  Guardado
                </p>
              )}

              {/* Prueba real contra la sesión de este negocio */}
              <div className="border-t border-slate-100 pt-4">
                <Field label="Probar envío" htmlFor="wa-test">
                  <div className="flex gap-2">
                    <Input
                      id="wa-test"
                      type="tel"
                      inputMode="tel"
                      placeholder="51987654321"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      disabled={testPhone.replace(/\D/g, '').length < 8 || test.isPending}
                      onClick={() => test.mutate()}
                      className="shrink-0"
                    >
                      <Send size={14} />
                      {test.isPending ? 'Enviando…' : 'Enviar'}
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Usa la sesión guardada. Guarda primero si acabas de cambiarla.
                  </p>
                </Field>

                {test.isError && (
                  <p className="mt-2 text-xs text-red-600">{apiErrorMessage(test.error)}</p>
                )}
                {test.isSuccess && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Check size={13} />
                    Enviado a {test.data.to}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Button
            className="flex-1"
            disabled={!canSave || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
