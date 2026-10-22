import type { WorkflowState } from '@/types'

/**
 * La regla del stock, dicha igual en todas las pantallas que la necesitan.
 *
 * El servidor descuenta mientras el pedido esté en el estado marcado o en uno
 * posterior, y devuelve si se cancela o retrocede. Si eso se explicara distinto
 * en Workflow y en Inventario, nadie terminaría de entenderlo.
 */
export function deductionPoint(fulfillment: WorkflowState[]): WorkflowState | null {
  return (
    [...fulfillment].filter((s) => s.deductsStock).sort((a, b) => a.position - b.position)[0] ??
    null
  )
}

export function stockRuleText(fulfillment: WorkflowState[]): string {
  const point = deductionPoint(fulfillment)
  if (!point) {
    return 'Ningún estado descuenta stock: el inventario solo cambia con las ventas del punto de venta y los ajustes que hagas a mano. Marca un estado en Workflow para que los pedidos también descuenten.'
  }
  return `El stock sale cuando un pedido llega a «${point.name}» o a un estado posterior, una sola vez. Vuelve si el pedido se cancela o regresa a un estado anterior a «${point.name}». Las ventas del punto de venta descuentan en el momento.`
}
