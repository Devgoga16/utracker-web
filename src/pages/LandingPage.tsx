import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listPublicPlans } from '@/api/plans'
import { useAuthStore } from '@/stores/authStore'
import { BeforeAfter } from './landing/BeforeAfter'
import { Bento } from './landing/Bento'
import { FaqSection } from './landing/FaqSection'
import { FeatureTabs } from './landing/FeatureTabs'
import { Footer } from './landing/Footer'
import { Hero } from './landing/Hero'
import { Nav, type NavSection } from './landing/Nav'
import { PartnersSection } from './landing/PartnersSection'
import { PricingSection } from './landing/PricingSection'
import { SignupSection } from './landing/SignupSection'
import { VideoSection } from './landing/VideoSection'

/* ────────────────────────────────────────────────────────────
   Landing

   El orden cuenta una historia: qué es (hero) → quiénes ya lo
   usan (socios) → qué problema resuelve (antes/después) → cómo
   se ve (video) → qué hace (funciones y extras) → cuánto cuesta
   → las dudas → la cuenta. Cada sección vive en su archivo en
   ./landing; aquí solo se arman.
   ──────────────────────────────────────────────────────────── */

const SECTIONS: NavSection[] = [
  { href: '#funciones', label: 'Cómo funciona' },
  { href: '#todo', label: 'Funciones' },
  { href: '#preguntas', label: 'Preguntas' },
]

export function LandingPage() {
  const { accessToken, activeTenant } = useAuthStore()

  /**
   * Misma clave que usa PricingSection, así que es una sola consulta.
   *
   * Hace falta aquí para no ofrecer "Precios" en el menú cuando la sección no
   * se va a dibujar: un enlace que no lleva a ningún lado es peor que no tener
   * el enlace.
   */
  const { data: plans } = useQuery({
    queryKey: ['public-plans'],
    queryFn: listPublicPlans,
    staleTime: 5 * 60 * 1000,
  })

  const sections = plans?.length
    ? [...SECTIONS.slice(0, 2), { href: '#precios', label: 'Precios' }, ...SECTIONS.slice(2)]
    : SECTIONS

  /*
   * Quien ya entró y viene al dominio pelado busca su panel, no el pitch.
   * Con `?vista=web` se muestra igual: el superadmin necesita ver la web
   * —socios, precios— sin cerrar su sesión.
   */
  const forceLanding = new URLSearchParams(window.location.search).get('vista') === 'web'
  if (accessToken && !forceLanding) {
    return <Navigate to={activeTenant ? '/today' : '/tenants'} replace />
  }

  return (
    <div className="bg-paper text-slate-900">
      <Nav sections={sections} />
      <main>
        <Hero />
        {/* Negocios que aceptaron aparecer; sin ninguno, no se dibuja. */}
        <PartnersSection />
        <BeforeAfter />
        <VideoSection />
        <FeatureTabs />
        <Bento />
        {/* Salen de la base, no de este archivo; sin planes públicos, no se dibuja. */}
        <PricingSection />
        <FaqSection />
        {/* El formulario aquí mismo, sin navegar. */}
        <SignupSection />
      </main>
      <Footer sections={sections} />
    </div>
  )
}
