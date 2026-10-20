import { Plus } from 'lucide-react'
import { Accent, Eyebrow, Headline, Reveal } from './primitives'

/**
 * Las dudas que frenan a alguien justo antes de crear la cuenta.
 *
 * Cada respuesta dice lo que el sistema hace hoy, no lo que suena bien: si
 * alguien se registra por una promesa que no se cumple, se va al día
 * siguiente y se lo cuenta a otros.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: '¿Necesito tarjeta para empezar?',
    a: 'No. Creas tu cuenta y tu negocio sin datos de pago, y lo pruebas con tus pedidos de verdad.',
  },
  {
    q: '¿Mis clientes tienen que descargar algo?',
    a: 'No. El link de seguimiento y tu tienda se abren en el navegador de cualquier celular, sin app y sin crear una cuenta.',
  },
  {
    q: '¿uTracker cobra por mí o se queda con una comisión?',
    a: 'Ninguna de las dos. Tu cliente te paga como siempre —Yape, Plin o transferencia— y en uTracker registras el pago y guardas la foto del comprobante.',
  },
  {
    q: '¿Puedo usarlo con mi equipo?',
    a: 'Sí. Invitas a cada persona por correo y entra con su rol: admin, staff o repartidor. Cuántas personas caben depende del plan.',
  },
  {
    q: '¿Funciona bien en el celular?',
    a: 'Está hecho para el celular: mueves un pedido de estado, cargas un adelanto o mandas el link sin sentarte frente a una computadora.',
  },
  {
    q: 'Tengo más de un negocio. ¿Necesito varias cuentas?',
    a: 'No. Con una sola cuenta manejas todos tus negocios y cambias de uno a otro en dos toques.',
  },
  {
    q: '¿Qué pasa si dejo de pagar?',
    a: 'No se borra nada. Tu negocio queda en solo lectura: sigues viendo tus pedidos y tus clientes, pero no registras nuevos hasta renovar.',
  },
]

export function FaqSection() {
  return (
    <section id="preguntas" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <Eyebrow>Preguntas</Eyebrow>
            <Headline className="mt-4 text-slate-900">
              Lo que todos <Accent className="text-brand-600">preguntan.</Accent>
            </Headline>
            <p className="mt-5 text-slate-500">
              ¿Te quedó otra duda? Crea tu cuenta y escríbenos desde Soporte, adentro del sistema.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="text-base font-medium text-slate-900 sm:text-lg">{item.q}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-[transform,background-color] duration-200 ease-snappy group-open:rotate-45 group-open:bg-ink group-open:text-white">
                    <Plus size={16} />
                  </span>
                </summary>
                {/* Solo un fundido: animar el alto haría recalcular la página en cada cuadro. */}
                <p className="pr-12 pb-6 leading-relaxed text-slate-600 transition-[opacity,transform] duration-300 ease-snappy starting:-translate-y-1 starting:opacity-0 motion-reduce:translate-y-0">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
