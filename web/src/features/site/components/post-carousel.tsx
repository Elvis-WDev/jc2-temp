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
    contenedor.scrollTo({
      left: destino * contenedor.clientWidth,
      behavior: 'smooth',
    })
    setActual(destino)
  }

  return (
    <div
      aria-roledescription='carousel'
      aria-label={pagina.titulo}
      // El carril de las flechas: en pantalla ancha el contenido se estrecha para
      // dejarles sitio propio. Colgarlas fuera del contenedor dependeria del margen que
      // quede a los lados, que cambia con la ventana, y acababan encima del texto.
      className='relative md:px-14'
    >
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
            <Diapositiva
              entrada={entrada}
              pagina={pagina}
              invertido={invertido}
            />
          </div>
        ))}
      </div>

      {hayVarias && (
        <>
          {/* A los lados de la diapositiva y no debajo: es donde se buscan cuando lo que
              se ve es una sola pieza a lo ancho. En pantalla estrecha no caben sin
              taparla, y ahi se pasa arrastrando, que es el gesto natural. */}
          <Flecha
            etiqueta='Anterior'
            posicion='start-0'
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
            posicion='end-0'
            invertido={invertido}
            deshabilitada={actual === entradas.length - 1}
            onClick={() => {
              irA(actual + 1)
            }}
          >
            <ChevronRight className='size-5' />
          </Flecha>

          <div className='mt-10 flex items-center justify-center gap-2'>
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
                  'size-2.5 rounded-full transition-colors',
                  indice === actual
                    ? 'bg-site-on-tertiary-container'
                    : invertido
                      ? 'bg-site-on-primary/25 hover:bg-site-on-primary/50'
                      : 'bg-site-primary/20 hover:bg-site-primary/40'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Una noticia ocupando el ancho de la banda: el texto a la izquierda y la portada a la
 * derecha.
 *
 * Sin tarjeta alrededor del texto: la banda ya es lisa y encerrarlo en un recuadro sobre
 * un fondo del mismo color solo anadiria un borde que no separa nada.
 *
 * Sin portada, el texto ocupa el ancho entero en lugar de dejar media diapositiva en
 * blanco. Eso hace que unas diapositivas midan mas que otras; se prefiere a reservar un
 * hueco gris en todas, que es lo que se veria mientras no haya ninguna imagen subida.
 */
function Diapositiva({
  entrada,
  pagina,
  invertido,
}: {
  entrada: PublicPost
  pagina: PaginaDeEntradas
  invertido: boolean
}) {
  const conPortada = entrada.imageUrl !== null

  return (
    <article className='grid items-center gap-10 md:grid-cols-12 lg:gap-16'>
      <div
        className={cn(
          'flex flex-col gap-5',
          conPortada ? 'md:col-span-6' : 'md:col-span-12'
        )}
      >
        {entrada.publishedAt !== null && (
          <span
            className={cn(
              'flex items-center gap-1.5 text-site-meta',
              invertido
                ? 'text-site-on-primary/70'
                : 'text-site-on-surface-variant'
            )}
          >
            <CalendarDays aria-hidden className='size-4' />
            {fechaLarga(entrada.publishedAt)}
          </span>
        )}

        <h3
          className={cn(
            'font-site-display text-site-headline-sm text-balance md:text-site-headline-md',
            invertido ? 'text-site-on-primary' : 'text-site-on-surface'
          )}
        >
          <Link
            to={pagina.rutaDeFicha}
            params={{ slug: entrada.slug }}
            className='transition-colors hover:text-site-primary'
          >
            {entrada.title}
          </Link>
        </h3>

        {entrada.summary !== null && (
          <p
            className={cn(
              'max-w-prose text-site-body-lg leading-relaxed',
              invertido
                ? 'text-site-on-primary/85'
                : 'text-site-on-surface-variant'
            )}
          >
            {entrada.summary}
          </p>
        )}

        <Link
          to={pagina.rutaDeFicha}
          params={{ slug: entrada.slug }}
          className={cn(
            'text-site-label tracking-wider uppercase underline-offset-4 hover:underline',
            invertido ? 'text-site-on-primary' : 'text-site-primary'
          )}
        >
          Read it
        </Link>
      </div>

      {conPortada && (
        <div className='md:col-span-6'>
          <img
            src={entrada.imageUrl as string}
            alt={entrada.imageAlt ?? ''}
            // `cover`: la portada llena su hueco sin deformarse, sea cual sea la forma
            // del archivo que se suba.
            className='aspect-[4/3] w-full rounded-site object-cover'
          />
        </div>
      )}
    </article>
  )
}

function Flecha({
  etiqueta,
  deshabilitada,
  invertido,
  posicion,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitada: boolean
  invertido: boolean
  /** Donde se ancla dentro del carrusel: a un lado o al otro. */
  posicion: string
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
        'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-site-surface-container-lowest transition-colors md:flex',
        'disabled:opacity-30',
        posicion,
        invertido
          ? 'border-site-on-primary/20 text-site-on-primary hover:bg-site-on-primary hover:text-site-primary disabled:hover:bg-transparent disabled:hover:text-site-on-primary'
          : 'border-site-primary/20 text-site-primary hover:bg-site-primary hover:text-site-on-primary disabled:hover:bg-transparent disabled:hover:text-site-primary'
      )}
    >
      {children}
    </button>
  )
}
