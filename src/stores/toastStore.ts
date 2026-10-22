import { create } from 'zustand'
import { apiErrorMessage } from '@/api/client'

export interface Toast {
  id: number
  tone: 'success' | 'error'
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (tone: Toast['tone'], message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

/**
 * Avisos breves de que algo salió bien o mal: «Pedido pasado a Listo».
 *
 * Para lo que se hace sin cambiar de pantalla (mover un pedido desde Hoy,
 * acciones en bloque), donde no queda otra señal de que funcionó. Los errores
 * de un formulario siguen yendo en el formulario, junto al campo.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, tone, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), tone === 'error' ? 6000 : 3500)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (error: unknown) =>
    useToastStore.getState().push('error', typeof error === 'string' ? error : apiErrorMessage(error)),
}
