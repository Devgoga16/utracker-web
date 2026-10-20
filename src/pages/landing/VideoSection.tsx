import { useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { Reveal } from './primitives'

/**
 * El video de presentación, el mismo que va a redes.
 *
 * `preload="none"`: son 7 MB y la mayoría no le va a dar play. Hasta el clic
 * solo se baja el póster. El botón propio está porque el control nativo es
 * chico y cada navegador lo dibuja distinto; una vez que arranca, quedan los
 * controles nativos para pausar y adelantar.
 */
export function VideoSection() {
  const video = useRef<HTMLVideoElement>(null)
  const [started, setStarted] = useState(false)

  const play = () => {
    setStarted(true)
    void video.current?.play()
  }

  return (
    <section id="video" aria-label="Video de presentación" className="scroll-mt-20 bg-paper pb-20 sm:pb-28">
      <Reveal className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-ink shadow-float ring-1 ring-slate-900/10">
          <video
            ref={video}
            src="/video/utracker.mp4"
            poster="/video/utracker-poster.jpg"
            preload="none"
            playsInline
            controls={started}
            width={1920}
            height={1080}
            className="block aspect-video h-auto w-full"
          />

          {!started && (
            <button
              type="button"
              onClick={play}
              className="focus-ring group absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-5 text-white sm:flex-row sm:justify-start sm:p-8"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-float transition-transform duration-200 ease-snappy group-hover:scale-105 group-active:scale-95 sm:size-16">
                <Play size={22} className="ml-0.5 fill-current" />
              </span>
              <span className="text-center sm:text-left">
                <span className="block text-lg font-semibold tracking-tight sm:text-xl">
                  Mira uTracker en un minuto
                </span>
                <span className="block text-sm text-white/70">Del cuaderno al link de seguimiento</span>
              </span>
            </button>
          )}
        </div>
      </Reveal>
    </section>
  )
}
