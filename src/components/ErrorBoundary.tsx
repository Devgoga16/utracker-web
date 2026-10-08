import { Component, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { reportClientError } from '@/api/tickets'
import { browserContext, recordFailure } from '@/lib/problemReport'
import { useSupportStore } from '@/stores/supportStore'
import { Button } from '@/components/ui'

interface State {
  error: Error | null
  ref?: string
}

/**
 * Atrapa los errores de render para que una pantalla rota no se lleve toda la
 * aplicación a una página en blanco.
 *
 * Además de mostrar algo decente, manda el error a los logs y ofrece abrir un
 * ticket ya armado. Una pantalla en blanco no deja rastro: el usuario recarga,
 * sigue trabajando y nadie se enteró nunca de que se rompió.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  async componentDidCatch(error: Error, info: ErrorInfo) {
    recordFailure({ label: `Render roto: ${error.message}` })

    const ref = await reportClientError({
      message: error.message,
      stack: `${error.stack ?? ''}\n--- componentStack ---${info.componentStack ?? ''}`,
      action: 'web:render',
      ...browserContext(),
    })

    if (ref) this.setState({ ref })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <CrashScreen
        error={this.state.error}
        logRef={this.state.ref}
        onRetry={() => this.setState({ error: null, ref: undefined })}
      />
    )
  }
}

function CrashScreen({
  error,
  logRef,
  onRetry,
}: {
  error: Error
  logRef?: string
  onRetry: () => void
}) {
  const openReporter = useSupportStore((s) => s.openReporter)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle size={22} />
      </span>

      <h1 className="text-lg font-semibold text-slate-900">Esta pantalla se rompió</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        No es algo que hayas hecho mal. Ya quedó registrado; podés reintentar o avisarnos para que
        lo arreglemos.
      </p>

      {logRef && (
        <p className="mt-3 text-xs text-slate-400">
          Código de referencia <span className="font-mono font-semibold">{logRef}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw size={15} />
          Reintentar
        </Button>
        <Button
          onClick={() =>
            openReporter({
              category: 'error',
              subject: `Pantalla rota: ${error.message.slice(0, 100)}`,
              logRef,
            })
          }
        >
          Reportar el problema
        </Button>
      </div>
    </div>
  )
}

/**
 * Engancha los errores que no pasan por React ni por axios: una promesa sin
 * atrapar, un script que falla suelto. Sin esto quedan solo en la consola del
 * usuario, que es como no existir.
 */
export function useGlobalErrorReporting() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      recordFailure({ label: `JS: ${event.message}` })
      void reportClientError({
        message: event.message,
        stack: event.error?.stack,
        action: 'web:window-error',
        ...browserContext(),
      })
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      // Los errores de axios ya los anotó el interceptor; no se duplican.
      if (reason?.isAxiosError) return

      recordFailure({ label: `Promesa rechazada: ${message}` })
      void reportClientError({
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        action: 'web:unhandled-rejection',
        ...browserContext(),
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
}
