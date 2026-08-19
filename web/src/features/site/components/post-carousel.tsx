import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PublicPost } from '../api'
import { fechaLarga } from '../post-format'
import { type PaginaDeEntradas } from '../post-pages'

/**
 * Las noticias de la portada, una a una.
 *
 * **No se mueve solo.** Se pasa con las flechas, con los puntos, con el teclado y
 * arrastrando. Un carrusel que gira por su cuenta obliga a leer a la velocidad que
 * decide la web, y con un solo elemento visible eso es una trampa de accesibilidad
 * (ERS §41). Aqui manda quien lee.
 *
 * El desplazamiento es del navegador —`scroll-snap`—, no una animacion inventada: asi
 * el arrastre en el movil, la rueda del raton y el teclado funcionan sin escribir nada,
 * y respeta la preferencia de movimiento reducido del sistema.
 *
 * Va dentro de su banda, no en lugar de ella: hereda el color del turno y el fondo que
 * el titular haya elegido, como cualquier otra seccion de la portada.
 */
export function PostCarousel({
  entradas,
  pagina,
  invertido,
}: {
  entradas: PublicPost[]
  pagina: PaginaDeEntradas
  /** Si la banda va sobre el solido o sobre una foto: el texto se invierte. */
  invertido: boolean
}) {
  const pista = useRef<HTMLDivElement>(null)
  const [actual, setActual] = useState(0)

  if (entradas.length === 0) return null

  // Con una sola no hay nada que pasar: es una tarjeta grande, no un carrusel de uno.
  const hayVarias = entradas.length > 1

  const irA = (indice: number) => {
    const contenedor = pista.current
    if (contenedor === null) return

    const destino = Math.max(0, Math.min(indice, entradas.length - 1))
    contenedor.scrollTo({ left: destino * contenedor.clientWidth, behavior: 'smooth' })
    setActual(destino)
  }

  return (
    <div aria-roledescription='carousel' aria-label={pagina.titulo}>
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
          'flex snap-x snap-mandatory overflow-x-auto',
          // La barra se oculta porque ya hay flechas y puntos; el arrastre sigue.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'focus-visible:outline-2 focus-visible:-outline-offset-2',
          invertido
            ? 'focus-visible:outline-site-on-primary'
            : 'focus-visible:outline-site-primary'
        )}
      >
        {entradas.map((entrada, indice) => (
          <div
            key={entrada.id}
            role='group'
            aria-roledescription='slide'
            aria-label={`${String(indice + 1)} de ${String(entradas.length)}`}
            className='w-full shrink-0 snap-start pe-px'
          >
            <Diapositiva entrada={entrada} pagina={pagina} />
          </div>
        ))}
      </div>

      {hayVarias && (
        <div className='mt-8 flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            {entradas.map((entrada, indice) => (
              <button
                key={entrada.id}
                type='button'
                aria-label={`Ir a la ${String(indice + 1)}`}
                aria-current={indice === actual ? 'true' : undefined}
                onClick={() => {
                  irA(indice)
                }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  indice === actual ? 'w-8' : 'w-4',
                  indice === actual
                    ? 'bg-site-on-tertiary-container'
                    : invertido
                      ? 'bg-site-on-primary/30 hover:bg-site-on-primary/60'
                      : 'bg-site-primary/20 hover:bg-site-primary/40'
                )}
              />
            ))}
          </div>

          <div className='flex items-center gap-2'>
            <Flecha
              etiqueta='Anterior'
              invertido={invertido}
              deshabilitada={actual === 0}
              onClick={() => {
                irA(actual - 1)
              }}
            >
              <ChevronLeft className='size-5' />
            </Flecha>
            <Flecha
              etiqueta='Siguiente'
              invertido={invertido}
              deshabilitada={actual === entradas.length - 1}
              onClick={() => {
                irA(actual + 1)
              }}
            >
              <ChevronRight className='size-5' />
            </Flecha>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Una noticia ocupando el ancho de la banda.
 *
 * La imagen va a un lado y el texto al otro; sin imagen el texto ocupa las dos
 * columnas, en lugar de dejar la mitad en blanco. La tarjeta es opaca a proposito: sobre
 * el solido de la banda o sobre una foto se sigue leyendo igual, sin invertir nada.
 */
function Diapositiva({
  entrada,
  pagina,
}: {
  entrada: PublicPost
  pagina: PaginaDeEntradas
}) {
  return (
    <article className='grid items-center gap-8 bg-site-surface-bright p-8 md:grid-cols-12 md:p-10'>
      {entrada.imageUrl !== null && (
        <img
          src={entrada.imageUrl}
          alt={entrada.imageAlt ?? ''}
          className='h-56 w-full rounded-site object-cover md:col-span-5 md:h-64'
        />
      )}

      <div
        className={cn(
          'flex flex-col gap-4',
          entrada.imageUrl === null ? 'md:col-span-12' : 'md:col-span-7'
        )}
      >
        {entrada.publishedAt !== null && (
          <span className='flex items-center gap-1.5 text-site-meta text-site-on-surface-variant'>
            <CalendarDays aria-hidden className='size-4' />
            {fechaLarga(entrada.publishedAt)}
          </span>
        )}

        <h3 className='font-site-display text-site-headline-sm text-balance text-site-on-surface md:text-site-headline-md'>
          <Link
            to={pagina.rutaDeFicha}
            params={{ slug: entrada.slug }}
            className='transition-colors hover:text-site-primary'
          >
            {entrada.title}
          </Link>
        </h3>

        {entrada.summary !== null && (
          <p className='text-site-body-lg text-site-on-surface-variant'>
            {entrada.summary}
          </p>
        )}

        <Link
          to={pagina.rutaDeFicha}
          params={{ slug: entrada.slug }}
          className='text-site-label tracking-wider text-site-primary uppercase underline-offset-4 hover:underline'
        >
          Read it
        </Link>
      </div>
    </article>
  )
}

function Flecha({
  etiqueta,
  deshabilitada,
  invertido,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitada: boolean
  invertido: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      aria-label={etiqueta}
      disabled={deshabilitada}
      onClick={onClick}
      className={cn(
        'flex size-10 items-center justify-center rounded-full border transition-colors disabled:opacity-30',
        invertido
          ? 'border-site-on-primary/20 text-site-on-primary hover:bg-site-on-primary hover:text-site-primary disabled:hover:bg-transparent disabled:hover:text-site-on-primary'
          : 'border-site-primary/20 text-site-primary hover:bg-site-primary hover:text-site-on-primary disabled:hover:bg-transparent disabled:hover:text-site-primary'
      )}
    >
      {children}
    </button>
  )
}
