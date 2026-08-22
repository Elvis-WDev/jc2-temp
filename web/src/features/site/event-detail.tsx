import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { ArrowLeft, Building2, CalendarDays, MapPin, User } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getEvent, getSite, type PublicEvent, type PublicSite } from './api'
import { EventButton } from './components/event-card'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { rangoDeFechas } from './event-format'
import { tonoDeBanda, useSectionBackground } from './use-section-background'
import {
  metadatosDeNoDisponible,
  resumirHtml,
  useSiteMeta,
} from './use-site-meta'

/** Ficha publica de un evento. */

const route = getRouteApi('/_public/events/$slug')

export function SiteEventDetail() {
  // La ficha hereda el fondo de la cabecera de su listado: es la misma pagina, vista
  // de cerca, y darle un mando propio multiplicaria los sitios donde elegir una foto.
  const sobreImagen = useSectionBackground('events.header') !== null
  const tono = tonoDeBanda(sobreImagen)

  const { slug } = route.useParams()

  const {
    data: evento,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.public.event(slug),
    queryFn: () => getEvent(slug),
    staleTime: 5 * 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  useSiteMeta(
    evento === undefined
      ? error === null
        ? null
        : metadatosDeNoDisponible('Event not available')
      : metadatosDeEvento(evento, site)
  )

  if (isPending) {
    return (
      <section className='mx-auto max-w-site px-site-margin py-site-section lg:px-site-gutter'>
        <p className='text-site-on-surface-variant'>Loading...</p>
      </section>
    )
  }

  if (error !== null) {
    const noExiste = error instanceof ApiError && error.status === 404
    return (
      <section className='mx-auto max-w-site px-site-margin py-site-section lg:px-site-gutter'>
        <h1 className='font-site-display text-site-headline-md text-site-primary'>
          {noExiste
            ? 'This event is not published.'
            : 'The event could not be loaded.'}
        </h1>
        <Link
          to='/events'
          className='mt-6 inline-flex items-center gap-2 text-site-label text-site-primary uppercase'
        >
          <ArrowLeft aria-hidden className='size-4' />
          Back to events
        </Link>
      </section>
    )
  }

  return (
    <>
      <section
        className={cn(
          'relative w-full overflow-hidden px-site-margin pt-16 pb-16 lg:px-site-gutter lg:pt-24',
          sobreImagen ? 'text-site-on-primary' : 'bg-site-surface-container'
        )}
      >
        <SectionBackground clave='events.header' />

        <div className='relative z-10 mx-auto flex max-w-site flex-col gap-6'>
          <Link
            to='/events'
            className={cn(
              'inline-flex items-center gap-2 text-site-label uppercase transition-colors',
              sobreImagen
                ? 'text-site-on-primary/70 hover:text-site-on-primary'
                : 'text-site-on-surface-variant hover:text-site-primary'
            )}
          >
            <ArrowLeft aria-hidden className='size-4' />
            Events
          </Link>

          {evento.typeLabel !== null && (
            <span
              className={cn(
                'text-site-label tracking-widest uppercase',
                tono.acento
              )}
            >
              {evento.typeLabel}
            </span>
          )}

          <h1 className='max-w-4xl font-site-display text-site-display-sm text-balance text-site-on-surface md:text-site-display-lg'>
            {evento.title}
          </h1>

          <dl className={cn('flex flex-wrap gap-x-8 gap-y-2', tono.cuerpo)}>
            <Dato
              icono={<CalendarDays aria-hidden className='size-4' />}
              nombre='When'
            >
              {rangoDeFechas(evento)}
            </Dato>
            {evento.location !== null && (
              <Dato
                icono={<MapPin aria-hidden className='size-4' />}
                nombre='Where'
              >
                {evento.location}
              </Dato>
            )}
            {evento.organizer !== null && (
              <Dato
                icono={<User aria-hidden className='size-4' />}
                nombre='Organised by'
              >
                {evento.organizer}
              </Dato>
            )}
            {evento.institutions.length > 0 && (
              <Dato
                icono={<Building2 aria-hidden className='size-4' />}
                nombre='With'
              >
                {evento.institutions.join(', ')}
              </Dato>
            )}
          </dl>

          {evento.button !== null && (
            <div className='pt-2'>
              <EventButton event={evento} />
            </div>
          )}
        </div>
      </section>

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto max-w-3xl'>
          {evento.imageUrl !== null && (
            <img
              src={evento.imageUrl}
              alt={evento.imageAlt ?? ''}
              className='mb-8 w-full rounded-site border border-site-outline-variant/30'
            />
          )}

          {evento.summary !== null && (
            <p className='mb-6 text-site-body-lg text-site-on-surface-variant'>
              {evento.summary}
            </p>
          )}

          {evento.contentHtml === null ? (
            evento.summary === null && (
              <p className='text-site-on-surface-variant'>
                This event has no further published details yet.
              </p>
            )
          ) : (
            <RichText
              html={evento.contentHtml}
              className='text-site-on-surface-variant'
            />
          )}
        </div>
      </section>
    </>
  )
}

function Dato({
  icono,
  nombre,
  children,
}: {
  icono: React.ReactNode
  nombre: string
  children: React.ReactNode
}) {
  return (
    <div className='flex items-center gap-2'>
      {icono}
      <dt className='sr-only'>{nombre}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** Metadatos de un evento, con JSON-LD `Event`. */
function metadatosDeEvento(evento: PublicEvent, site: PublicSite | undefined) {
  return {
    title:
      site === undefined ? evento.title : `${evento.title} · ${site.siteName}`,
    description: evento.summary ?? resumirHtml(evento.contentHtml),
    path: `/events/${evento.slug}`,
    imageUrl: evento.imageUrl ?? site?.meta.ogImageUrl ?? null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: evento.title,
      description:
        evento.summary ?? resumirHtml(evento.contentHtml, 5000) ?? undefined,
      startDate: evento.startsAt,
      endDate: evento.endsAt ?? undefined,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location:
        evento.location === null
          ? undefined
          : {
              '@type': 'Place',
              name: evento.location,
              address: evento.location,
            },
      organizer:
        evento.organizer === null
          ? undefined
          : { '@type': 'Organization', name: evento.organizer },
      image: evento.imageUrl ?? undefined,
      url: evento.button?.url ?? undefined,
    },
  }
}
