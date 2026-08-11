import { Link } from '@tanstack/react-router'
import { CalendarDays, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PublicEvent } from '../api'
import { rangoDeFechas } from '../event-format'

/**
 * Un evento en el listado.
 *
 * No hubo plantilla para Eventos, asi que usa el lenguaje de las tarjetas de Research:
 * mismo filete al pasar por encima, misma linea de metadatos y mismas tipografias.
 */
export function EventCard({ event }: { event: PublicEvent }) {
  return (
    <article className='group relative overflow-hidden border border-site-primary-container/10 bg-site-surface-bright transition-shadow hover:shadow-sm'>
      <div
        aria-hidden
        className='absolute top-0 bottom-0 left-0 z-10 w-1 origin-top scale-y-0 bg-site-primary-container transition-transform duration-300 ease-out group-hover:scale-y-100'
      />

      <div className='flex flex-col gap-6 sm:flex-row'>
        {event.imageUrl !== null && (
          <img
            src={event.imageUrl}
            alt={event.imageAlt ?? ''}
            className='h-48 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0'
          />
        )}

        <div className='flex-1 p-6'>
          <div className='flex flex-wrap items-center gap-3'>
            {event.typeLabel !== null && (
              <span className='text-site-label tracking-widest text-site-on-surface-variant uppercase'>
                {event.typeLabel}
              </span>
            )}
            <span className='flex items-center gap-1.5 text-site-meta text-site-on-surface-variant'>
              <CalendarDays aria-hidden className='size-4' />
              {rangoDeFechas(event)}
            </span>
            {event.location !== null && (
              <span className='flex items-center gap-1.5 text-site-meta text-site-on-surface-variant'>
                <MapPin aria-hidden className='size-4' />
                {event.location}
              </span>
            )}
          </div>

          <h2 className='mt-2 font-site-display text-site-headline-sm text-site-on-surface'>
            <Link
              to='/events/$slug'
              params={{ slug: event.slug }}
              className='transition-colors hover:text-site-primary'
            >
              {event.title}
            </Link>
          </h2>

          {event.summary !== null && (
            <p className='mt-2 text-site-on-surface-variant'>{event.summary}</p>
          )}

          {(event.organizer !== null || event.institutions.length > 0) && (
            <p className='mt-2 text-site-meta text-site-on-surface-variant'>
              {[event.organizer, ...event.institutions]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

/** El boton propio del evento, con el color que el titular eligio. */
export function EventButton({
  event,
  className,
}: {
  event: PublicEvent
  className?: string
}) {
  if (event.button === null) return null

  return (
    <a
      href={event.button.url}
      className={cn(
        'inline-flex items-center justify-center rounded-site px-6 py-3 text-site-meta tracking-wider uppercase transition-opacity hover:opacity-90',
        // Sin color elegido se usa el del sitio, en vez de dejarlo sin fondo.
        event.button.color === null && 'bg-site-primary text-site-on-primary',
        className
      )}
      style={
        event.button.color === null
          ? undefined
          : { backgroundColor: event.button.color, color: '#ffffff' }
      }
    >
      {event.button.label ?? 'More information'}
    </a>
  )
}
