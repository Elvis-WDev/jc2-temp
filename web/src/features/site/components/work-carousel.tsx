import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, FileText, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PublicWorkSummary } from '../api'
import { coautores, referencia } from '../work-format'
import { SectionBackground } from './section-background'
import { SiteButton } from './site-button'

/**
 * El carrusel que encabeza la portada.
 *
 * **No se mueve solo.** Se pasa con las flechas, con los puntos, con el teclado y
 * arrastrando. Un carrusel que gira por su cuenta obliga a leer a la velocidad que
 * decide la web, y con un solo elemento visible eso es una trampa de accesibilidad
 * (ERS §41). Aqui manda quien lee.
 *
 * El desplazamiento es del navegador —`scroll-snap`—, no una animacion inventada: asi
 * el arrastre en el movil, la rueda del raton y el teclado funcionan sin escribir nada,
 * y respeta la preferencia de movimiento reducido del sistema.
 */
export function WorkCarousel({
  works,
  ownerName,
}: {
  works: PublicWorkSummary[]
  ownerName: string | null
}) {
  const pista = useRef<HTMLDivElement>(null)
  const [actual, setActual] = useState(0)

  if (works.length === 0) return null

  // Con uno solo no hay nada que pasar: es una tarjeta grande, no un carrusel de uno.
  const hayVarios = works.length > 1

  const irA = (indice: number) => {
    const contenedor = pista.current
    if (contenedor === null) return

    const destino = Math.max(0, Math.min(indice, works.length - 1))
    contenedor.scrollTo({
      left: destino * contenedor.clientWidth,
      behavior: 'smooth',
    })
    setActual(destino)
  }

  return (
    <section
      aria-roledescription='carousel'
      aria-label='Featured publications'
      className='relative w-full overflow-hidden bg-site-primary text-site-on-primary'
    >
      {/* La banda ya es oscura y su texto claro: la imagen entra sin invertir nada. */}
      <SectionBackground clave='home.carousel' />

      <div
        ref={pista}
        tabIndex={0}
        onScroll={(evento) => {
          const contenedor = evento.currentTarget
          setActual(Math.round(contenedor.scrollLeft / contenedor.clientWidth))
        }}
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowRight') {
            evento.preventDefault()
            irA(actual + 1)
          }
          if (evento.key === 'ArrowLeft') {
            evento.preventDefault()
            irA(actual - 1)
          }
        }}
        className={cn(
          'relative flex snap-x snap-mandatory overflow-x-auto',
          // La barra se oculta porque ya hay flechas y puntos; el arrastre sigue.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-site-on-primary'
        )}
      >
        {works.map((work, indice) => (
          <div
            key={work.id}
            role='group'
            aria-roledescription='slide'
            aria-label={`${String(indice + 1)} de ${String(works.length)}`}
            className='w-full shrink-0 snap-start'
          >
            <Diapositiva work={work} ownerName={ownerName} />
          </div>
        ))}
      </div>

      {hayVarios && (
        <div className='relative mx-auto flex max-w-site items-center justify-between gap-4 px-site-margin pb-site-gutter lg:px-site-gutter'>
          <div className='flex items-center gap-2'>
            {works.map((work, indice) => (
              <button
                key={work.id}
                type='button'
                aria-label={`Go to publication ${String(indice + 1)}`}
                aria-current={indice === actual ? 'true' : undefined}
                onClick={() => {
                  irA(indice)
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  indice === actual
                    ? 'w-8 bg-site-on-tertiary-container'
                    : 'w-4 bg-site-on-primary/30 hover:bg-site-on-primary/60'
                )}
              />
            ))}
          </div>

          <div className='flex items-center gap-2'>
            <Flecha
              etiqueta='Previous publication'
              deshabilitada={actual === 0}
              onClick={() => {
                irA(actual - 1)
              }}
            >
              <ChevronLeft className='size-5' />
            </Flecha>
            <Flecha
              etiqueta='Next publication'
              deshabilitada={actual === works.length - 1}
              onClick={() => {
                irA(actual + 1)
              }}
            >
              <ChevronRight className='size-5' />
            </Flecha>
          </div>
        </div>
      )}
    </section>
  )
}

function Diapositiva({
  work,
  ownerName,
}: {
  work: PublicWorkSummary
  ownerName: string | null
}) {
  return (
    <div className='mx-auto grid max-w-site items-center gap-12 px-site-margin py-16 lg:grid-cols-12 lg:px-site-gutter'>
      <div className='space-y-6 lg:col-span-7'>
        <div className='flex flex-wrap items-center gap-3'>
          <span className='text-site-label tracking-widest text-site-on-primary/60 uppercase'>
            {work.type.label}
          </span>
          {work.year !== null && (
            <span className='text-site-meta text-site-on-primary/60'>
              {work.year}
            </span>
          )}
          <span className='text-site-label tracking-widest text-site-on-tertiary-container uppercase'>
            {work.academicStatusLabel}
          </span>
        </div>

        <h2 className='font-site-display text-site-display-sm text-balance text-site-on-primary lg:text-site-headline-md'>
          <Link
            to='/research/$slug'
            params={{ slug: work.slug }}
            className='hover:underline'
          >
            {work.title}
          </Link>
        </h2>

        {work.subtitle !== null && (
          <p className='text-site-body-lg text-site-on-primary/80'>
            {work.subtitle}
          </p>
        )}

        <p className='text-site-on-primary/70 italic'>
          {coautores(work.authors, ownerName)}
        </p>

        {referencia(work) !== null && (
          <p className='font-semibold text-site-on-primary/90'>
            {referencia(work)}
          </p>
        )}

        <div className='flex flex-wrap gap-4 pt-2'>
          {work.pdfUrl !== null && (
            <SiteButton
              href={work.pdfUrl}
              className='bg-site-on-primary text-site-primary hover:bg-site-on-primary/90'
            >
              <FileText aria-hidden className='size-4' />
              PDF
            </SiteButton>
          )}
          {work.doiUrl !== null && (
            <SiteButton
              href={work.doiUrl}
              variant='outline'
              className='border-site-on-primary/40 text-site-on-primary hover:bg-site-on-primary/10'
            >
              <Link2 aria-hidden className='size-4' />
              DOI
            </SiteButton>
          )}
          <Link
            to='/research/$slug'
            params={{ slug: work.slug }}
            className='inline-flex items-center text-site-label tracking-wider text-site-on-primary/70 uppercase transition-colors hover:text-site-on-primary'
          >
            Full page
          </Link>
        </div>
      </div>

      {work.tags.length > 0 && (
        <div className='lg:col-span-4 lg:col-start-9'>
          <p className='mb-3 text-site-label tracking-widest text-site-on-primary/50 uppercase'>
            Topics
          </p>
          <div className='flex flex-wrap gap-2'>
            {work.tags.map((tag) => (
              <span
                key={tag.slug}
                className='rounded-full border border-site-on-primary/20 px-3 py-1 text-site-meta text-site-on-primary/80'
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Flecha({
  etiqueta,
  deshabilitada,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitada: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      aria-label={etiqueta}
      disabled={deshabilitada}
      onClick={onClick}
      className='flex size-10 items-center justify-center rounded-full border border-site-on-primary/20 text-site-on-primary transition-colors hover:bg-site-on-primary hover:text-site-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-site-on-primary'
    >
      {children}
    </button>
  )
}
