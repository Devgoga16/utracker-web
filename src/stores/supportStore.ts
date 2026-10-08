import { create } from 'zustand'
import type { TicketCategory } from '@/types'

export interface ReportDraft {
  subject?: string
  body?: string
  category?: TicketCategory
  /** Código del log de la API, si el error ya quedó registrado del lado servidor. */
  logRef?: string
  /** Fallas ya formateadas que se adjuntan al ticket. */
  failures?: string[]
}

interface SupportUiState {
  /** null = el diálogo está cerrado. */
  draft: ReportDraft | null
  openReporter: (draft?: ReportDraft) => void
  closeReporter: () => void
}

/**
 * Estado del diálogo "reportar un problema".
 *
 * Va en un store global y no en props porque el disparador puede ser cualquier
 * cosa: un botón del menú, un error de red en una página cualquiera o un
 * render que explotó dentro de un ErrorBoundary. Todos necesitan abrir el
 * mismo formulario sin tener que pasarse callbacks por media aplicación.
 */
export const useSupportStore = create<SupportUiState>((set) => ({
  draft: null,
  openReporter: (draft) => set({ draft: draft ?? {} }),
  closeReporter: () => set({ draft: null }),
}))
