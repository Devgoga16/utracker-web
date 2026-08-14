import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { getWorkflow } from '@/api/tenants'
import { createState, deleteState, reorderStates, updateState } from '@/api/workflow'
import { apiErrorMessage } from '@/api/client'
import { Alert, Button, Card, Field, Input, Spinner } from '@/components/ui'
import { ICON_GROUPS, StateIcon } from '@/lib/icons'
import type { MembershipRole, WorkflowKind, WorkflowState } from '@/types'

const PALETTE = ['#0ea5e9', '#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#64748b']
const ROLES: MembershipRole[] = ['owner', 'admin', 'staff', 'driver']

export function WorkflowPage() {
  const { data: workflow, isLoading } = useQuery({ queryKey: ['workflow'], queryFn: getWorkflow })

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Workflow</h1>
        <p className="text-sm text-slate-500">
          Arrastrá los estados para reordenarlos. Los cambios aplican a los pedidos nuevos y a los
          que ya están en curso.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StateColumn
          title="Estados del pedido"
          kind="fulfillment"
          states={workflow?.fulfillment ?? []}
        />
        <StateColumn title="Estados del pago" kind="payment" states={workflow?.payment ?? []} />
      </div>
    </div>
  )
}

function StateColumn({
  title,
  kind,
  states,
}: {
  title: string
  kind: WorkflowKind
  states: WorkflowState[]
}) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  // Local copy so a drag reorders instantly instead of waiting for the round trip.
  const [items, setItems] = useState(states)
  useEffect(() => setItems(states), [states])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['workflow'] })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const addMutation = useMutation({
    mutationFn: () =>
      createState({ kind, name: newName, color: PALETTE[0], icon: 'circle-dashed' }),
    onSuccess: () => {
      invalidate()
      setNewName('')
      setAdding(false)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => reorderStates(kind, orderedIds),
    onSuccess: invalidate,
    // Snap back to the server's truth if the write failed.
    onError: invalidate,
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const from = items.findIndex((s) => s._id === active.id)
    const to = items.findIndex((s) => s._id === over.id)
    if (from === -1 || to === -1) return

    const next = arrayMove(items, from, to)
    setItems(next)
    reorderMutation.mutate(next.map((s) => s._id))
  }

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>

      {reorderMutation.isError && (
        <div className="mb-3">
          <Alert>{apiErrorMessage(reorderMutation.error)}</Alert>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((s) => s._id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((state) => (
              <SortableStateRow key={state._id} state={state} onChanged={invalidate} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {adding ? (
        <form
          className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
        >
          {addMutation.isError && <Alert>{apiErrorMessage(addMutation.error)}</Alert>}
          <Field label="Nombre del estado" htmlFor={`new-${kind}`}>
            <Input
              id={`new-${kind}`}
              autoFocus
              required
              placeholder="Ej. En ruta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Agregando...' : 'Agregar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded-lg border-2 border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          + Agregar estado
        </button>
      )}
    </Card>
  )
}

function SortableStateRow({
  state,
  onChanged,
}: {
  state: WorkflowState
  onChanged: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: state._id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-90 shadow-lg' : undefined}
    >
      <StateRow
        state={state}
        onChanged={onChanged}
        dragHandle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Reordenar ${state.name}`}
            className="shrink-0 cursor-grab touch-none rounded p-2 text-slate-400 hover:bg-white/60 hover:text-slate-700 active:cursor-grabbing sm:p-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        }
      />
    </li>
  )
}

function StateRow({
  state,
  onChanged,
  dragHandle,
}: {
  state: WorkflowState
  onChanged: () => void
  dragHandle: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [draft, setDraft] = useState({
    name: state.name,
    icon: state.icon ?? '',
    color: state.color,
    notifyCustomer: state.notifyCustomer,
    vibrant: state.vibrant,
    requiresLink: state.requiresLink,
    allowedRoles: state.allowedRoles,
  })

  const saveMutation = useMutation({
    mutationFn: () => updateState(state._id, draft),
    onSuccess: () => {
      onChanged()
      setOpen(false)
    },
  })

  const initialMutation = useMutation({
    mutationFn: () => updateState(state._id, { isInitial: true }),
    onSuccess: onChanged,
  })

  const finalMutation = useMutation({
    mutationFn: () => updateState(state._id, { isFinal: !state.isFinal }),
    onSuccess: onChanged,
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteState(state._id),
    onSuccess: onChanged,
    onError: () => setConfirmingDelete(false),
  })

  const error =
    saveMutation.error ?? initialMutation.error ?? finalMutation.error ?? deleteMutation.error

  // The backend refuses these too; hiding the button avoids a pointless round trip.
  const canDelete = !state.isCancellation && !state.isInitial

  function toggleRole(role: MembershipRole) {
    setDraft((d) => ({
      ...d,
      allowedRoles: d.allowedRoles.includes(role)
        ? d.allowedRoles.filter((r) => r !== role)
        : [...d.allowedRoles, role],
    }))
  }

  const tags = [
    state.isInitial && 'inicial',
    state.isFinal && 'final',
    state.notifyCustomer && 'notifica',
    state.isCancellation && 'cancelación',
    state.vibrant && 'vibrante',
    state.requiresLink && 'link',
  ].filter(Boolean) as string[]

  return (
    <div className="rounded-lg" style={{ backgroundColor: `${state.color}12` }}>
      <div className="px-2 py-2">
        <div className="flex items-center gap-2">
          {dragHandle}

          <StateIcon name={state.icon} size={18} color={state.color} />
          <span className="min-w-0 flex-1 truncate font-medium" style={{ color: state.color }}>
            {state.name}
          </span>

          {/* En mobile los tags bajan a su propia línea: acá se desbordaban. */}
          <div className="hidden items-center gap-1.5 text-xs sm:flex">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <button
            type="button"
            aria-label={`Editar ${state.name}`}
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 rounded p-2 transition-colors ${
              open ? 'bg-white text-slate-800' : 'text-slate-500 hover:bg-white hover:text-slate-800'
            }`}
          >
            <Pencil size={14} />
          </button>

          {canDelete && (
            <button
              type="button"
              aria-label={`Eliminar ${state.name}`}
              onClick={() => setConfirmingDelete(true)}
              className="shrink-0 rounded p-2 text-slate-400 transition-colors hover:bg-white hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5 pl-10 text-xs sm:hidden">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
      </div>

      {confirmingDelete && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/60 px-3 py-2.5 text-sm">
          <span className="text-slate-700">
            ¿Eliminar <strong>{state.name}</strong>?
          </span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="danger"
              className="px-3 py-1"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
            <Button
              variant="secondary"
              className="px-3 py-1"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 pb-3">
          <Alert>{apiErrorMessage(error)}</Alert>
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t border-white/60 px-3 py-3">
          <Field label="Nombre" htmlFor={`name-${state._id}`}>
            <Input
              id={`name-${state._id}`}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Color</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() => setDraft({ ...draft, color })}
                  className={`size-8 rounded-full transition-transform sm:size-7 ${
                    draft.color === color ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <IconPicker
            value={draft.icon}
            color={draft.color}
            onChange={(icon) => setDraft({ ...draft, icon })}
          />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Quién puede mover un pedido a este estado
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
                    draft.allowedRoles.includes(role)
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white text-slate-500 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* items-start + hint debajo: en mobile el hint inline empujaba el
              texto fuera de la tarjeta. */}
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.notifyCustomer}
              onChange={(e) => setDraft({ ...draft, notifyCustomer: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 rounded"
            />
            <span className="min-w-0">
              Notificar al cliente al llegar a este estado
              <span className="block text-xs text-slate-400">
                (pendiente de integrar WhatsApp)
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.vibrant}
              onChange={(e) => setDraft({ ...draft, vibrant: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 rounded"
            />
            <span className="min-w-0">
              Estado vibrante
              <span className="block text-xs text-slate-400">
                el ícono pulsa en el link del cliente
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.requiresLink}
              onChange={(e) => setDraft({ ...draft, requiresLink: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 rounded"
            />
            <span className="min-w-0">
              Link necesario
              <span className="block text-xs text-slate-400">
                al pasar aquí pedirá pegar un link (ej. tracking del courier)
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/60 pt-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>

            {!state.isInitial && (
              <Button
                variant="secondary"
                onClick={() => initialMutation.mutate()}
                disabled={initialMutation.isPending}
              >
                Marcar como inicial
              </Button>
            )}

            {!state.isCancellation && (
              <Button
                variant="secondary"
                onClick={() => finalMutation.mutate()}
                disabled={finalMutation.isPending}
              >
                {state.isFinal ? 'Quitar de final' : 'Marcar como final'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Tag({ children }: { children: string }) {
  return <span className="rounded bg-white px-1.5 py-0.5 text-slate-500">{children}</span>
}

function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (name: string) => void
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">Ícono</span>
      <div className="max-h-52 space-y-3 overflow-y-auto rounded-lg bg-white/70 p-2 ring-1 ring-slate-200">
        {ICON_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-0.5 text-xs font-medium text-slate-400 uppercase">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(group.icons).map(([name, Icon]) => {
                const selected = value === name
                return (
                  <button
                    key={name}
                    type="button"
                    aria-label={name}
                    aria-pressed={selected}
                    title={name}
                    onClick={() => onChange(name)}
                    className={`flex size-9 items-center justify-center rounded-md transition-colors sm:size-8 ${
                      selected ? 'ring-2 ring-slate-900' : 'hover:bg-slate-100'
                    }`}
                    style={selected ? { backgroundColor: `${color}1f` } : undefined}
                  >
                    <Icon size={17} color={selected ? color : '#475569'} strokeWidth={2} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
