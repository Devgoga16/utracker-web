/**
 * La guía de implementación de la tienda integrada, en Markdown.
 *
 * Se arma en el navegador con los datos reales del negocio —su API, su llave
 * y su nombre— para que quien la reciba (un programador, una agencia o una
 * IA) pueda copiar y pegar sin adivinar nada. Todo lo que dice tiene que
 * coincidir con `storefront.controller.ts`: si cambia la API, cambia aquí.
 *
 * El código de ejemplo evita las comillas invertidas y `${` a propósito: vive
 * dentro de un template literal y así no hay nada que escapar.
 */

const FENCE = '```'

export function storefrontGuideFilename(storeSlug?: string) {
  return `utracker-tienda-${storeSlug || 'integracion'}.md`
}

export function buildStorefrontGuide({
  storeName,
  apiBase,
  storeKey,
  appOrigin,
}: {
  storeName: string
  apiBase: string
  /** La llave viva del negocio, o null si todavía no creó ninguna. */
  storeKey: string | null
  appOrigin: string
}) {
  const key = storeKey ?? 'TU_LLAVE'
  const today = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })

  return `# Tienda de ${storeName} en tu web — guía de implementación

> Generada desde uTracker el ${today}. Sirve para cualquier web: HTML propio, WordPress, Wix, Shopify, Webflow, React, Next.js, etc.
> Si se la pasas a una IA o a un programador, tiene todo lo necesario para dejar la tienda funcionando.

## Resumen en 30 segundos

1. Tu web pide el catálogo a uTracker con una **llave de tienda**.
2. Tu web muestra los productos y arma el carrito como quiera (diseño 100 % tuyo).
3. Al pagar, tu web manda el carrito a uTracker y recibe un **link de checkout**.
4. El cliente completa sus datos, la entrega y el comprobante del adelanto en ese checkout, que hospeda uTracker.
5. El pedido entra solo al panel de uTracker, con su link de seguimiento. Tu web recibe un aviso para vaciar el carrito.

No necesitas servidor propio ni base de datos: todo se hace desde el navegador.

---

## Datos de conexión

| Dato | Valor |
|---|---|
| URL base de la API | \`${apiBase}\` |
| Llave de tienda | \`${key}\` |
| Cabecera de la llave | \`X-Store-Key\` (o el parámetro \`?key=\` en la URL) |

${
  storeKey
    ? '> La llave es **publicable**: puede ir en el código de la página, a la vista. Solo da acceso al catálogo (que ya es público) y a iniciar una compra; nunca a pedidos, clientes ni ajustes.'
    : '> **Todavía no tienes una llave.** Créala en uTracker → Integración → Llaves de tienda y reemplaza `TU_LLAVE` en todo este documento.'
}

### Antes de empezar

- [ ] El plan del negocio incluye **API de tienda** (si no, la API responde 403).
- [ ] En uTracker → Ajustes, la tienda tiene al menos un **tipo de entrega** (recojo o delivery). Sin eso no acepta pedidos en línea.
- [ ] Los productos que quieres vender están **activos** y con precio.
- [ ] Si limitaste dominios en la llave, el dominio de tu web está en la lista **exactamente igual** (con \`https://\` y sin barra final). Para probar en tu computadora agrega también \`http://localhost:PUERTO\` o deja la llave sin dominios.

---

## Opción rápida: copiar y pegar

Este bloque es una tienda completa (catálogo, filtros por categoría, variantes, carrito y pago). Pégalo donde tu web acepte HTML:

- **HTML propio:** dentro del \`<body>\`, donde quieras que aparezca la tienda.
- **WordPress:** bloque «HTML personalizado».
- **Wix:** «Insertar código» → «Insertar HTML» (elige «Código», no «Sitio web»).
- **Shopify:** sección «Liquid personalizado» o «HTML personalizado».
- **Webflow / Framer / Squarespace:** elemento «Embed» o «Code block».

${FENCE}html
<div id="utracker-store"></div>

<script>
(function () {
  /* ── Configuración ─────────────────────────────────────────── */
  var API = '${apiBase}';
  var KEY = '${key}';
  // A dónde vuelve el cliente al terminar de pagar.
  var RETURN_URL = window.location.href;
  // Moneda: los precios de uTracker están en soles.
  function money(n) { return 'S/ ' + Number(n || 0).toFixed(2); }

  /* ── Estado ────────────────────────────────────────────────── */
  var root = document.getElementById('utracker-store');
  var state = { config: null, products: [], categories: [], category: '', cart: {}, error: '', done: null };

  function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'X-Store-Key': KEY }, options.body ? { 'Content-Type': 'application/json' } : {});
    return fetch(API + path, Object.assign({}, options, { headers: headers })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data.message || 'No se pudo conectar con la tienda');
        return data;
      });
    });
  }

  /* ── Helpers de DOM (sin innerHTML: los textos vienen del catálogo) ── */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'className') node.className = props[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), props[k]);
      else if (props[k] !== undefined && props[k] !== null && props[k] !== false) node.setAttribute(k, props[k]);
    });
    [].concat(children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  /* ── Carrito ───────────────────────────────────────────────── */
  function lineKey(productId, variant) { return productId + '|' + (variant || ''); }
  function unitPrice(product, variant) {
    var v = (product.variants || []).filter(function (x) { return x.name === variant; })[0];
    return v ? v.price : product.price;
  }
  function addToCart(product, variant) {
    var k = lineKey(product.id, variant);
    var line = state.cart[k] || { product: product, variant: variant, quantity: 0 };
    if (product.stock !== null && line.quantity + 1 > product.stock) {
      state.error = 'Solo quedan ' + product.stock + ' de "' + product.name + '"';
    } else {
      line.quantity += 1;
      state.error = '';
    }
    state.cart[k] = line;
    render();
  }
  function changeQty(k, delta) {
    var line = state.cart[k];
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) delete state.cart[k];
    render();
  }
  function cartLines() { return Object.keys(state.cart).map(function (k) { return Object.assign({ key: k }, state.cart[k]); }); }
  function cartTotal() {
    return cartLines().reduce(function (sum, l) { return sum + unitPrice(l.product, l.variant) * l.quantity; }, 0);
  }

  /* ── Pago ──────────────────────────────────────────────────── */
  function checkout() {
    // La ventana se abre YA, dentro del clic: si se abre después del fetch,
    // el navegador la bloquea como popup.
    var win = window.open('', 'utracker-checkout', 'width=520,height=760');
    state.error = '';
    api('/storefront/checkout', {
      method: 'POST',
      body: JSON.stringify({
        items: cartLines().map(function (l) {
          return { productId: l.product.id, quantity: l.quantity, variant: l.variant || undefined };
        }),
        returnUrl: RETURN_URL
      })
    }).then(function (data) {
      if (win && !win.closed) win.location.href = data.checkoutUrl;
      else window.location.href = data.checkoutUrl; // popup bloqueado: misma pestaña
    }).catch(function (err) {
      if (win) win.close();
      state.error = err.message;
      render();
    });
  }

  // uTracker avisa cuando el cliente confirmó el pedido.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'utracker') return;
    if (e.data.type === 'checkout:completed') {
      state.cart = {};
      state.done = { trackingUrl: e.data.trackingUrl };
      render();
    }
  });

  /* ── Vista ─────────────────────────────────────────────────── */
  function productCard(p) {
    var variants = p.variants || [];
    var select = variants.length
      ? el('select', { className: 'ut-select', 'aria-label': 'Opción' }, variants.map(function (v) {
          return el('option', { value: v.name }, v.name + ' · ' + money(v.price));
        }))
      : null;
    var quoted = p.pricingMode === 'quoted';
    var soldOut = !p.inStock;
    return el('article', { className: 'ut-card' }, [
      p.images && p.images[0] ? el('img', { className: 'ut-img', src: p.images[0], alt: p.name, loading: 'lazy' }) : el('div', { className: 'ut-img ut-img-empty' }),
      el('div', { className: 'ut-body' }, [
        el('h3', { className: 'ut-name' }, p.name),
        p.description ? el('p', { className: 'ut-desc' }, p.description) : null,
        el('p', { className: 'ut-price' }, quoted ? 'Precio a cotizar' : money(p.price)),
        p.preparationDays ? el('p', { className: 'ut-note' }, 'Se prepara con ' + p.preparationDays + ' día(s) de anticipación') : null,
        select,
        el('button', {
          className: 'ut-btn',
          disabled: soldOut || quoted ? 'disabled' : null,
          onclick: function () { addToCart(p, select ? select.value : ''); }
        }, soldOut ? 'Agotado' : quoted ? 'Consúltanos' : 'Agregar')
      ])
    ]);
  }

  function cartView() {
    var lines = cartLines();
    if (!lines.length) return null;
    return el('aside', { className: 'ut-cart' }, [
      el('h3', { className: 'ut-cart-title' }, 'Tu pedido'),
      el('ul', { className: 'ut-lines' }, lines.map(function (l) {
        return el('li', { className: 'ut-line' }, [
          el('span', { className: 'ut-line-name' }, l.product.name + (l.variant ? ' (' + l.variant + ')' : '')),
          el('span', { className: 'ut-qty' }, [
            el('button', { className: 'ut-qty-btn', 'aria-label': 'Quitar uno', onclick: function () { changeQty(l.key, -1); } }, '−'),
            String(l.quantity),
            el('button', { className: 'ut-qty-btn', 'aria-label': 'Agregar uno', onclick: function () { changeQty(l.key, 1); } }, '+')
          ]),
          el('span', { className: 'ut-line-total' }, money(unitPrice(l.product, l.variant) * l.quantity))
        ]);
      })),
      el('div', { className: 'ut-total' }, [el('span', {}, 'Total'), el('strong', {}, money(cartTotal()))]),
      el('button', { className: 'ut-btn ut-btn-pay', onclick: checkout }, 'Continuar con el pago'),
      el('p', { className: 'ut-note' }, 'Eliges la entrega y pagas en una ventana segura de uTracker.')
    ]);
  }

  function render() {
    root.innerHTML = '';
    root.className = 'ut-store';
    var config = state.config;
    if (!config) { root.appendChild(el('p', { className: 'ut-muted' }, state.error || 'Cargando tienda…')); return; }

    if (config.store.brandColor) root.style.setProperty('--ut-brand', config.store.brandColor);

    if (state.done) {
      root.appendChild(el('div', { className: 'ut-done' }, [
        el('h3', {}, '¡Pedido confirmado!'),
        el('p', {}, 'Gracias por tu compra. Puedes ver cómo avanza tu pedido aquí:'),
        el('a', { href: state.done.trackingUrl, target: '_blank', rel: 'noopener', className: 'ut-btn' }, 'Ver mi pedido')
      ]));
    }

    if (!config.store.acceptsOnlineOrders) {
      root.appendChild(el('p', { className: 'ut-alert' }, 'Por ahora no estamos recibiendo pedidos en línea.'));
    }
    if (state.error) root.appendChild(el('p', { className: 'ut-alert' }, state.error));

    if (state.categories.length > 1) {
      root.appendChild(el('div', { className: 'ut-chips' }, [''].concat(state.categories).map(function (c) {
        return el('button', {
          className: 'ut-chip' + (state.category === c ? ' is-active' : ''),
          onclick: function () { state.category = c; render(); }
        }, c || 'Todo');
      })));
    }

    var visible = state.products.filter(function (p) { return !state.category || p.category === state.category; });
    var layout = el('div', { className: 'ut-layout' }, [
      el('div', { className: 'ut-grid' }, visible.length ? visible.map(productCard) : [el('p', { className: 'ut-muted' }, 'No hay productos en esta categoría.')]),
      config.store.acceptsOnlineOrders ? cartView() : null
    ]);
    root.appendChild(layout);
  }

  /* ── Arranque ──────────────────────────────────────────────── */
  Promise.all([api('/storefront/config'), api('/storefront/products')])
    .then(function (r) {
      state.config = r[0];
      state.products = r[1].products;
      state.categories = r[1].categories;
      render();
    })
    .catch(function (err) { state.error = err.message; render(); });
})();
</script>

<style>
  .ut-store { --ut-brand: #f97316; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #18181b; }
  .ut-store * { box-sizing: border-box; }
  .ut-layout { display: grid; gap: 24px; align-items: start; }
  @media (min-width: 900px) { .ut-layout { grid-template-columns: 1fr 320px; } }
  .ut-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
  .ut-card { border: 1px solid #e4e4e7; border-radius: 14px; overflow: hidden; background: #fff; display: flex; flex-direction: column; }
  .ut-img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; background: #f4f4f5; }
  .ut-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .ut-name { font-size: 15px; font-weight: 600; margin: 0; }
  .ut-desc { font-size: 13px; color: #71717a; margin: 0; }
  .ut-price { font-size: 15px; font-weight: 600; margin: 2px 0 0; }
  .ut-note { font-size: 12px; color: #71717a; margin: 0; }
  .ut-muted { color: #71717a; }
  .ut-select { padding: 8px; border: 1px solid #d4d4d8; border-radius: 8px; font: inherit; font-size: 13px; }
  .ut-btn { margin-top: auto; display: inline-flex; justify-content: center; align-items: center; padding: 10px 14px; border: 0; border-radius: 10px; background: var(--ut-brand); color: #fff; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none; }
  .ut-btn[disabled] { background: #d4d4d8; cursor: not-allowed; }
  .ut-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  .ut-chip { padding: 6px 12px; border-radius: 999px; border: 1px solid #e4e4e7; background: #fff; font: inherit; font-size: 13px; cursor: pointer; }
  .ut-chip.is-active { background: #18181b; color: #fff; border-color: #18181b; }
  .ut-cart { position: sticky; top: 16px; border: 1px solid #e4e4e7; border-radius: 14px; padding: 16px; background: #fff; display: flex; flex-direction: column; gap: 12px; }
  .ut-cart-title { margin: 0; font-size: 16px; }
  .ut-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .ut-line { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; font-size: 13px; }
  .ut-qty { display: inline-flex; align-items: center; gap: 6px; }
  .ut-qty-btn { width: 26px; height: 26px; border-radius: 8px; border: 1px solid #e4e4e7; background: #fff; cursor: pointer; font: inherit; }
  .ut-line-total { font-weight: 600; min-width: 72px; text-align: right; }
  .ut-total { display: flex; justify-content: space-between; border-top: 1px solid #f4f4f5; padding-top: 12px; font-size: 15px; }
  .ut-alert { padding: 10px 14px; border-radius: 10px; background: #fef2f2; color: #b91c1c; font-size: 14px; }
  .ut-done { padding: 16px; border-radius: 14px; background: #f0fdf4; color: #14532d; margin-bottom: 16px; display: grid; gap: 8px; justify-items: start; }
  .ut-done h3, .ut-done p { margin: 0; }
</style>
${FENCE}

Listo: con esto la tienda ya funciona. El resto del documento es para quien quiera armar su propio diseño o entender cómo funciona por dentro.

---

## Cómo funciona por dentro

### 1. Traer los datos de la tienda

${FENCE}http
GET ${apiBase}/storefront/config
X-Store-Key: ${key}
${FENCE}

Respuesta:

${FENCE}json
{
  "store": {
    "name": "${storeName}",
    "slug": "mi-negocio",
    "logoUrl": "https://…/logo.png",
    "brandColor": "#f97316",
    "phone": "51987654321",
    "schedule": [{ "day": 1, "open": "09:00", "close": "18:00" }],
    "deliveryTypes": ["pickup", "delivery_own"],
    "deliveryFranjas": ["morning", "afternoon", "evening"],
    "acceptsOnlineOrders": true
  },
  "filters": [{ "id": "…", "name": "Sabor", "values": ["Chocolate", "Vainilla"] }],
  "checkoutBaseUrl": "${appOrigin}/checkout"
}
${FENCE}

- \`schedule[].day\`: 0 = domingo … 6 = sábado.
- \`deliveryTypes\`: \`pickup\` = recojo en tienda, \`delivery_own\` = delivery del negocio.
- \`deliveryFranjas\`: turnos de entrega (\`morning\` mañana, \`afternoon\` tarde, \`evening\` noche).
- Si \`acceptsOnlineOrders\` es \`false\`, muestra el catálogo pero no dejes pagar.

### 2. Traer el catálogo

${FENCE}http
GET ${apiBase}/storefront/products
X-Store-Key: ${key}
${FENCE}

Respuesta:

${FENCE}json
{
  "products": [
    {
      "id": "665f…",
      "kind": "product",
      "name": "Torta de chocolate",
      "description": "Para 12 personas",
      "price": 85,
      "pricingMode": "fixed",
      "images": ["https://…/torta.jpg"],
      "category": "Tortas",
      "variants": [
        { "name": "Mediana", "priceModifier": 0, "price": 85 },
        { "name": "Grande", "priceModifier": 30, "price": 115 }
      ],
      "attributes": [{ "filter": "…id del filtro…", "values": ["Chocolate"] }],
      "inStock": true,
      "stock": 8,
      "preparationDays": 2,
      "requiresAdvance": true,
      "advanceType": "percent",
      "advanceValue": 50
    }
  ],
  "categories": ["Postres", "Tortas"],
  "total": 1
}
${FENCE}

Cómo leer cada campo:

| Campo | Qué significa |
|---|---|
| \`price\` | Precio base en soles. |
| \`variants[].price\` | Precio final de esa opción (base + \`priceModifier\`). Manda el \`name\` de la variante al pagar. |
| \`pricingMode\` | \`fixed\` = precio fijo. \`quoted\` = se cotiza: muéstralo pero no lo vendas en línea. |
| \`kind\` | \`product\` o \`service\`. |
| \`inStock\` / \`stock\` | Si \`stock\` es \`null\`, el negocio no lleva control y siempre hay. Si es un número, no dejes pedir más que eso. |
| \`preparationDays\` | Días de anticipación que necesita. El checkout ya no deja elegir fechas antes. |
| \`requiresAdvance\` | Si pide adelanto. \`advanceType\` es \`percent\` (porcentaje) o \`fixed\` (monto en soles). |
| \`attributes\` | Valores de los filtros de \`/config\` (por \`filter\` = id del filtro). Sirve para filtros propios. |

Solo llegan los productos **activos**.

### 3. Campañas y preventas (opcional)

${FENCE}http
GET ${apiBase}/storefront/campaigns
X-Store-Key: ${key}
${FENCE}

Devuelve las campañas vigentes (\`name\`, \`description\`, \`startDate\`, \`endDate\`, \`status\`, \`items\` con \`available\`) y un \`url\` con su página propia. Lo más simple es mostrar un banner que lleve a ese \`url\`: la campaña tiene su propio stock y su propio flujo de compra.

### 4. Mandar el carrito a pagar

${FENCE}http
POST ${apiBase}/storefront/checkout
X-Store-Key: ${key}
Content-Type: application/json

{
  "items": [
    { "productId": "665f…", "quantity": 2, "variant": "Grande" }
  ],
  "returnUrl": "https://tuweb.com/gracias"
}
${FENCE}

Respuesta (201):

${FENCE}json
{
  "sessionId": "…",
  "checkoutUrl": "${appOrigin}/checkout/…",
  "totalAmount": 230,
  "advanceDue": 115,
  "expiresAt": "2026-01-01T15:00:00.000Z"
}
${FENCE}

- **El precio lo calcula uTracker**, no tu web: aunque alguien cambie el precio en el navegador, se cobra el del catálogo.
- \`variant\` va solo si el producto tiene variantes, y con el \`name\` exacto.
- Máximo 50 líneas por carrito.
- El link de checkout **vence en 60 minutos**. Créalo cuando el cliente toca «Pagar», no antes.
- \`returnUrl\` (opcional) es a dónde vuelve el cliente desde el botón final del checkout.

### 5. Abrir el checkout

Dos formas, las dos válidas:

- **Ventana aparte (recomendado):** el cliente no sale de tu web. Abre la ventana **dentro del clic** y después ponle la URL; si la abres después del \`fetch\`, el navegador la bloquea.

${FENCE}js
botonPagar.addEventListener('click', async () => {
  const win = window.open('', 'utracker-checkout', 'width=520,height=760')
  const res = await fetch('${apiBase}/storefront/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Store-Key': '${key}' },
    body: JSON.stringify({ items: carrito, returnUrl: location.href })
  })
  const data = await res.json()
  if (!res.ok) { win?.close(); return mostrarError(data.message) }
  if (win && !win.closed) win.location.href = data.checkoutUrl
  else location.href = data.checkoutUrl
})
${FENCE}

- **Misma pestaña:** \`location.href = data.checkoutUrl\`. Al terminar, el cliente vuelve con el botón que lleva a \`returnUrl\`.

En el checkout, el cliente pone su nombre y celular, elige recojo o delivery, la fecha y el turno, y sube la foto del adelanto si el pedido lo pide.

### 6. Saber que terminó

Si abriste una ventana aparte, uTracker le avisa a tu página:

${FENCE}js
window.addEventListener('message', (e) => {
  if (e.data?.source !== 'utracker') return
  if (e.data.type === 'checkout:completed') {
    vaciarCarrito()
    mostrarGracias(e.data.trackingUrl) // link de seguimiento del pedido
  }
})
${FENCE}

Con la opción de misma pestaña, usa tu página de \`returnUrl\` como «gracias» y vacía el carrito ahí.

---

## Ejemplo en React / Next.js

${FENCE}tsx
const API = '${apiBase}'
const KEY = '${key}'

type Product = {
  id: string; name: string; price: number; pricingMode: 'fixed' | 'quoted'
  images: string[]; category?: string; inStock: boolean; stock: number | null
  variants: { name: string; price: number }[]
}

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([])
  useEffect(() => {
    fetch(API + '/storefront/products', { headers: { 'X-Store-Key': KEY } })
      .then((r) => r.json())
      .then((d) => setProducts(d.products))
  }, [])
  return products
}

export async function pagar(items: { productId: string; quantity: number; variant?: string }[]) {
  const win = window.open('', 'utracker-checkout', 'width=520,height=760')
  const res = await fetch(API + '/storefront/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Store-Key': KEY },
    body: JSON.stringify({ items, returnUrl: window.location.href }),
  })
  const data = await res.json()
  if (!res.ok) { win?.close(); throw new Error(data.message) }
  if (win && !win.closed) win.location.href = data.checkoutUrl
  else window.location.href = data.checkoutUrl
}
${FENCE}

En Next.js, llama a la API desde componentes de cliente (\`'use client'\`) o desde el servidor; la llave es la misma.

---

## Errores

Todas las respuestas de error traen \`{ "message": "…" }\` en español, listo para mostrar al cliente.

| Código | Cuándo pasa | Qué hacer |
|---|---|---|
| 401 | Falta la llave, o fue revocada | Revisa \`X-Store-Key\`; crea una nueva en Integración. |
| 403 | El dominio no está autorizado, o el plan no incluye la API de tienda | Agrega el dominio a la llave, o revisa el plan. |
| 404 | La tienda está desactivada | Escribe a soporte de uTracker. |
| 400 | Carrito vacío, cantidad inválida, variante que ya no existe, o la tienda no acepta pedidos en línea | Muestra el \`message\` y deja corregir el carrito. |
| 409 | Un producto ya no está disponible o no alcanza el stock | Muestra el \`message\` y vuelve a pedir el catálogo. |

---

## Seguridad

- La llave solo puede leer el catálogo y crear sesiones de pago. No ve pedidos, clientes ni dinero.
- Limita la llave a tus dominios en uTracker → Integración: así nadie puede usarla desde otra web.
- Si una llave se filtró o ya no la usas, **revócala**: deja de funcionar al instante. Crea otra y reemplázala en tu web.
- Usa una llave distinta por cada web; así revocas una sin afectar las demás.
- uTracker no cobra con tarjeta ni guarda medios de pago: el cliente paga por los medios del negocio (Yape, Plin, transferencia…) y sube su comprobante.

---

## Lista de verificación antes de publicar

- [ ] El catálogo carga y las fotos se ven.
- [ ] Un producto con variantes cobra el precio de la variante elegida.
- [ ] Un producto agotado no se puede agregar.
- [ ] «Continuar con el pago» abre el checkout (prueba también en el celular).
- [ ] Haz un pedido de prueba completo y revisa que aparezca en uTracker → Pedidos.
- [ ] Tu web se entera del pedido (se vacía el carrito o vuelve a tu página de gracias).
- [ ] Cancela el pedido de prueba desde uTracker.
`
}
