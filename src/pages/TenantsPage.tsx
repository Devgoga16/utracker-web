import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTenant, listMyTenants } from '@/api/tenants'
import { apiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Alert, Button, Card, Field, Input, Spinner } from '@/components/ui'
import type { Tenant } from '@/types'

export function TenantsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, setActiveTenant, logout } = useAuthStore()
  const [newName, setNewName] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: tenants, isLoading } = useQuery({ queryKey: ['tenants'], queryFn: listMyTenants })

  const createMutation = useMutation({
    mutationFn: () => createTenant({ name: newName }),
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      selectTenant({ ...tenant, role: 'owner' })
    },
  })

  function selectTenant(tenant: Tenant) {
    setActiveTenant(tenant)
    navigate('/orders')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">Tus negocios</h1>
          <p className="text-sm text-slate-500">Hola {user?.name}, elige con cuál trabajar</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          Salir
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {tenants?.map((tenant) => (
            <button
              key={tenant._id}
              type="button"
              onClick={() => selectTenant(tenant)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-white p-4 text-left ring-1 ring-slate-200 transition-shadow hover:ring-brand-400 sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                {tenant.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt=""
                    className="size-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{tenant.name}</p>
                  <p className="truncate text-sm text-slate-500">/{tenant.slug}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {tenant.role}
              </span>
            </button>
          ))}

          {showForm ? (
            <Card>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  createMutation.mutate()
                }}
              >
                {createMutation.isError && <Alert>{apiErrorMessage(createMutation.error)}</Alert>}

                <Field
                  label="Nombre del negocio"
                  htmlFor="tenant-name"
                  hint="Se crea con un workflow por defecto que puedes editar después"
                >
                  <Input
                    id="tenant-name"
                    required
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </Field>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creando...' : 'Crear negocio'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full rounded-xl border-2 border-dashed border-slate-300 p-5 text-sm font-medium text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600"
            >
              + Crear un negocio nuevo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
