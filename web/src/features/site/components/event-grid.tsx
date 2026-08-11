import { Link } from '@tanstack/react-router'
import { CalendarDays, MapPin } from 'lucide-react'
import { type PublicEvent } from '../api'
import { rangoDeFechas } from '../event-format'
import { EventButton } from './event-card'

/**
 * Los eventos al final de la portada, en rejilla.
 *
 * Tres columnas en escritorio, dos en tableta y una en el movil. La imagen de portada
 * arriba y debajo todo lo que hace falta para decidir si interesa: tipo, cuando, donde,
 * quien organiza, el resumen y su boton.
 *
 * Toda la tarjeta lleva a la ficha; el boton propio del evento va aparte, porque suele
 * apuntar a otro sitio —una inscripcion, un programa— y meterlo dentro de un enlace
 * seria un enlace dentro de otro.
 */
export function EventGrid({ events }: { events: PublicEvent[] }) {
  return (
    <ul className='grid gap-8 sm:grid-cols-2 lg:grid-cols-3'>
      {events.map((evento) => (
        <li key={evento.id} className='flex'>
          <Tarjeta event={evento} />
        </li>
      ))}
    </ul>
  )
}

function Tarjeta({ event }: { event: PublicEvent }) {
  return (
    <article className='group flex w-full flex-col overflow-hidden border border-site-outline-variant/30 bg-site-surface-container-lowest transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'>
      {event.imageUrl === null ? (
        // Sin portada, una banda con el motivo: una tarjeta mas corta que las de al
        // lado desalinearia la rejilla entera.
        <div aria-hidden className='h-40 w-full bg-site-primary-container'>
          <div className='size-full site-texture-light opacity-20' />
        </div>
      ) : (
        <img
          src={event.imageUrl}
          alt={event.imageAlt ?? ''}
          className='h-40 w-full object-cover'
        />
      )}

      <div className='flex flex-1 flex-col gap-3 p-6'>
        {event.typeLabel !== null && (
          <span className='text-site-label tracking-widest text-site-on-tertiary-fixed-variant uppercase'>
            {event.typeLabel}
          </span>
        )}

        <h3 className='font-site-display text-site-headline-sm text-site-primary'>
          <Link
            to='/events/$slug'
            params={{ slug: event.slug }}
            className='transition-colors hover:text-site-on-tertiary-fixed-variant'
          >
            {event.title}
          </Link>
        </h3>

        <p className='flex items-center gap-2 text-site-meta text-site-on-surface-variant'>
          <CalendarDays aria-hidden className='size-4 shrink-0' />
          {rangoDeFechas(event)}
        </p>

        {event.location !== null && (
          <p className='flex items-center gap-2 text-site-meta text-site-on-surface-variant'>
            <MapPin aria-hidden className='size-4 shrink-0' />
            {event.location}
          </p>
        )}

        {event.summary !== null && (
          <p className='text-site-on-surface-variant'>{event.summary}</p>
        )}

        {(event.organizer !== null || event.institutions.length > 0) && (
          <p className='text-site-meta text-site-on-surface-variant/80'>
            {[event.organizer, ...event.institutions]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {event.button !== null && (
          // `mt-auto` alinea los botones de las tres tarjetas aunque sus textos midan
          // distinto.
          <div className='mt-auto pt-2'>
            <EventButton event={event} className='px-4 py-2' />
          </div>
        )}
      </div>
    </article>
  )
}
