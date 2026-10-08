import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Building2, Check, Send, ServerCog, ShieldCheck } from 'lucide-react'
import { getSharedBotConfig, sendWaTest } from '@/api/whatsapp'
import {
  Alert,
  Button,

  Input,
  PageHeader,
  SettingGroup,
  SettingRow,
  Spinner,
} from '@/components/ui'

/**
 * Bot compartido de uTracker.
 *
 * Ya no hay pantalla de QR: la sesión se administra fuera de uTracker y la API
 * del bot no expone ni estado ni código. Lo único verificable desde acá es si
 * tenemos credenciales y si un envío real llega.
 */
export function SuperadminWhatsappPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['wa-shared-config'],
    queryFn: getSharedBotConfig,
  })

  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const test = useMutation({
    mutationFn: () => sendWaTest(phone, message || undefined),
  })

  const digits = phone.replace(/\D/g, '')
  const canSend = digits.length >= 8 && digits.length <= 15

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="WhatsApp"
        description="El bot compartido que usan los negocios sin sesión propia."
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <Alert error={error} />
      ) : (
        <>
          <SettingGroup
            title="Bot compartido"
            description="Se configura en las variables de entorno del servidor."
          >
            <SettingRow label="Estado">
              {data?.configured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <Check size={14} />
                  Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                  <ServerCog size={14} />
                  Falta configurar
                </span>
              )}
            </SettingRow>

            <SettingRow label="URL de envío" hint="Incluye la sesión. No es secreta." wide>
              <code className="block truncate rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 ring-1 ring-slate-200">
                {data?.sendUrl ?? 'Sin definir (WHATSAPP_SEND_URL)'}
              </code>
            </SettingRow>

            <SettingRow label="API key">
              <span className="text-sm text-slate-600">
                {data?.hasKey ? '•••••••• guardada' : 'Sin definir (WHATSAPP_API_KEY)'}
              </span>
            </SettingRow>
          </SettingGroup>

          {!data?.configured && (
            <Alert>
              Define <code className="font-mono">WHATSAPP_SEND_URL</code> y{' '}
              <code className="font-mono">WHATSAPP_API_KEY</code> en el servidor y reinícialo. Sin
              eso, los negocios sin sesión propia no reciben ni envían notificaciones.
            </Alert>
          )}

          <SettingGroup
            title="Probar envío"
            description="Manda un mensaje real por el bot compartido."
          >
            <SettingRow label="Número de destino" htmlFor="wa-to" wide>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="wa-to"
                  type="tel"
                  inputMode="tel"
                  placeholder="51987654321"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    test.reset()
                  }}
                />
                <Input
                  placeholder="Mensaje (opcional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button
                  disabled={!canSend || test.isPending || !data?.configured}
                  onClick={() => test.mutate()}
                  className="shrink-0"
                >
                  <Send size={15} />
                  {test.isPending ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>

              <p className="mt-1.5 text-xs text-slate-500">
                Con código de país. El bot lo agrega si falta.
              </p>

              {test.isError && (
                <div className="mt-2.5">
                  <Alert error={test.error} />
                </div>
              )}
              {test.isSuccess && (
                <p className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                  <Check size={15} />
                  Enviado a {test.data.to}. Revisa el celular.
                </p>
              )}
            </SettingRow>
          </SettingGroup>

          <SettingGroup
            title="Sesiones propias"
            description="Un negocio puede mandar desde su propio número."
          >
            <SettingRow
              label="Configurar por negocio"
              hint="En la tabla de Negocios, el botón de WhatsApp de cada fila."
            >
              <Link to="/superadmin/tenants">
                <Button variant="secondary" size="sm">
                  <Building2 size={15} />
                  Ir a Negocios
                </Button>
              </Link>
            </SettingRow>

            <div className="flex gap-3 px-4 py-3.5 sm:px-5">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-500">
                Las llaves de las sesiones propias se guardan cifradas al nivel de consulta: no
                viajan en respuestas normales y al leerlas solo se devuelven sus últimos
                caracteres. Un negocio sin sesión propia usa este bot compartido.
              </p>
            </div>
          </SettingGroup>
        </>
      )}
    </div>
  )
}
