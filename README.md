# uTracker Web

Frontend de uTracker. Consume [`utracker-api`](../utracker-api).

## Stack

- React 19 + TypeScript + Vite
- React Router (rutas + guards)
- TanStack Query (fetching y cache del server state)
- Zustand (sesión y negocio activo, persistido en localStorage)
- Tailwind CSS v4
- lucide-react (iconos)

## Iconos

`WorkflowState.icon` guarda un **nombre** (`"truck"`, `"circle-check"`), no un emoji — los emojis se dibujan distinto en cada sistema operativo.

El registry vive en [`src/lib/icons.tsx`](src/lib/icons.tsx): un set curado de 54 iconos agrupados por categoría (Estado, Preparación, Entrega, Pago, Otros). Se importan por nombre, así que el bundle solo incluye esos y no los ~1500 de lucide.

```tsx
<StateIcon name={state.icon} size={16} color={state.color} />
```

`StateIcon` cae a un placeholder neutro (`circle-dashed`) si el nombre no existe, así que un dato viejo o corrupto nunca rompe el render.

> **Los nombres del registry son un contrato con la base de datos.** Renombrar una clave de `ICON_GROUPS` deja huérfanos los estados que la usaban — hay que acompañarlo de una migración (ver `utracker-api`, `npm run migrate:icons`).

## Estructura

```
src/
  api/          # cliente axios + un módulo por recurso
  components/   # UI base, layout, guards de ruta
  pages/        # una pantalla por archivo
  stores/       # zustand (auth + tenant activo)
  types/        # tipos espejo del backend
  lib/          # helpers (cn, formatCurrency, formatDateTime)
```

## Correr localmente

La API tiene que estar corriendo en `http://localhost:4000` — Vite proxea `/api` hacia allá (ver `vite.config.ts`).

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`.

## Rutas

**Públicas**

| Ruta | Qué es |
|---|---|
| `/login`, `/register` | Acceso a la cuenta |
| `/order/:token` | Lo que ve el cliente al abrir el link de pedido. Sin login, con contador de expiración en vivo. |
| `/track/:token` | **Seguimiento del pedido.** Lo que el cliente consulta después de comprar: estado actual, línea de tiempo del workflow, detalle y estado de pago. Se refresca solo cada 30s. |

> Son dos links distintos y es a propósito: `/order/:token` es **antes** de la compra y vence a las 24h; `/track/:token` es **después** y no vence.

**Protegidas** (requieren sesión)

| Ruta | Qué es |
|---|---|
| `/tenants` | Elegir o crear negocio |
| `/orders` | Tablero de pedidos con filtro por estado |
| `/orders/new` | Alta manual **o** generación de link para el cliente |
| `/orders/:id` | Detalle, historial y cambio de estado |
| `/products` | Catálogo |
| `/workflow` | Editor del workflow: agregar, renombrar, color, ícono, reordenar (drag & drop), roles y estado inicial/final |

Las rutas de negocio pasan por dos guards: `RequireAuth` (hay token) y `RequireTenant` (hay negocio activo). El negocio activo se manda a la API en el header `X-Tenant-Id`.

## Manejo de sesión

El interceptor de axios en `src/api/client.ts` inyecta el bearer token y el `X-Tenant-Id` en cada request. Ante un `401` intenta refrescar el token una sola vez y reintenta el request original; si el refresh falla, cierra sesión. Los 401 concurrentes comparten un mismo refresh en vuelo.

## Pendiente

- Vista de repartidor (rol `driver`): solo sus pedidos asignados
- Registrar intentos de entrega desde la UI (el endpoint ya existe)
- Notificaciones WhatsApp
