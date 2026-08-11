import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getPageContent, getSite, listEvents, type EventsQuery } from './api'
import { EventCard } from './components/event-card'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SitePagination } from './components/site-pagination'
import { useSectionBackground } from './use-section-background'
import { resumirHtml, titulo, useSiteMeta } from './use-site-meta'

/**
 * Eventos.
 *
 * No estaba en las plantillas, pero el modulo existe y se gestiona desde el panel:
 * dejarlo invisible seria un agujero. Usa el lenguaje de Research.
 *
 * Su cabecera sale de `page_content`, igual que las de Research y Docencia. Nacio con
 * un titulo fijo porque entonces la tabla solo tenia tres claves; la migracion que
 * anadio los interruptores por seccion creo tambien la fila `events`, y el panel lleva
 * desde entonces ofreciendo editar un titulo y una entradilla que aqui no se leian.
 */

const route = getRouteApi('/_public/events/')

export function SiteEvents() {
  const busqueda = route.useSearch()
  const navigate = route.useNavigate()

  const consulta: EventsQuery = busqueda
  const {
    data: resultado,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.events(consulta),
    queryFn: () => listEvents(consulta),
    staleTime: 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const { data: page } = useQuery({
    queryKey: queryKeys.public.page('events'),
    queryFn: () => getPageContent('events'),
    staleTime: 5 * 60_000,
  })

  useSiteMeta({
    title: titulo(page?.pageTitle ?? 'Events', site?.siteName),
    description:
      resumirHtml(page?.introHtml ?? null) ??
      'Seminars, conferences and academic activities.',
    path: '/events',
    imageUrl: site?.meta.ogImageUrl ?? null,
  })

  const soloProximos = busqueda.upcoming === true
  // Sobre una foto oscurecida el texto oscuro no se lee: la cabecera se invierte.
  const sobreImagen = useSectionBackground('events.header') !== null

  return (
    <>
      <section
        className={cn(
          'relative w-full overflow-hidden px-site-margin pt-16 pb-24 lg:px-site-gutter lg:pt-24 lg:pb-32',
          sobreImagen ? 'text-site-on-primary' : 'bg-site-surface-container'
        )}
      >
        <SectionBackground clave='events.header' />

        <div className='relative z-10 mx-auto grid max-w-site grid-cols-1 items-end gap-site-gutter md:grid-cols-12'>
          <div className='flex flex-col gap-6 md:col-span-8'>
            {page?.eyebrow != null && (
              <p
                className={cn(
                  'text-site-label tracking-[0.2em] uppercase',
                  sobreImagen
                    ? 'text-site-on-primary/70'
                    : 'text-site-on-surface-variant'
                )}
              >
                {page.eyebrow}
              </p>
            )}
            <h1
              className={cn(
                'font-site-display text-site-display-sm tracking-tight md:text-site-display-lg',
                sobreImagen ? 'text-site-on-primary' : 'text-site-on-surface'
              )}
            >
              {page?.pageTitle ?? 'Events'}
            </h1>
            {page?.introHtml == null ? (
              <p
                className={cn(
                  'max-w-2xl text-site-body-lg leading-relaxed',
                  sobreImagen
                    ? 'text-site-on-primary/85'
                    : 'text-site-on-surface-variant'
                )}
              >
                Seminars, conferences and academic activities.
              </p>
            ) : (
              <RichText
                html={page.introHtml}
                className={cn(
                  'max-w-2xl text-site-body-lg leading-relaxed',
                  sobreImagen
                    ? 'text-site-on-primary/85'
                    : 'text-site-on-surface-variant'
                )}
              />
            )}
          </div>

          {resultado !== undefined && (
            <div className='flex justify-start md:col-span-4 md:justify-end'>
              <div className='flex flex-col items-start gap-2 md:items-end'>
                <span
                  className={cn(
                    'text-site-meta tracking-widest uppercase',
                    sobreImagen
                      ? 'text-site-on-primary/70'
                      : 'text-site-on-surface-variant'
                  )}
                >
                  Agenda
                </span>
                <span
                  className={cn(
                    'text-site-label',
                    sobreImagen
                      ? 'text-site-on-primary'
                      : 'text-site-on-surface'
                  )}
                >
                  {resultado.pagination.totalItems}{' '}
                  {resultado.pagination.totalItems === 1 ? 'event' : 'events'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto flex max-w-site flex-col gap-8'>
          <div className='flex flex-wrap items-center gap-3 border-b border-site-outline-variant pb-4'>
            <Alternativa
              activa={!soloProximos}
              onClick={() => {
                void navigate({ search: { page: 1 } })
              }}
            >
              All
            </Alternativa>
            <Alternativa
              activa={soloProximos}
              onClick={() => {
                void navigate({ search: { upcoming: true, page: 1 } })
              }}
            >
              Upcoming
            </Alternativa>
          </div>

          {isPending && (
            <p className='text-site-on-surface-variant'>Loading...</p>
          )}

          {isError && (
            <p className='text-site-on-surface-variant'>
              The agenda could not be loaded. Please try again in a moment.
            </p>
          )}

          {resultado !== undefined && resultado.items.length === 0 && (
            <div className='flex flex-col items-start gap-4 py-12'>
              <p className='font-site-display text-site-headline-sm text-site-primary'>
                {soloProximos
                  ? 'No upcoming event has been announced.'
                  : 'No events published yet.'}
              </p>
              {soloProximos && (
                <button
                  type='button'
                  onClick={() => {
                    void navigate({ search: { page: 1 } })
                  }}
                  className='text-site-label text-site-primary uppercase underline underline-offset-4'
                >
                  See all events
                </button>
              )}
            </div>
          )}

          {resultado !== undefined && resultado.items.length > 0 && (
            <>
              <div className='flex flex-col gap-6'>
                {resultado.items.map((evento) => (
                  <EventCard key={evento.id} event={evento} />
                ))}
              </div>

              <SitePagination
                pagination={resultado.pagination}
                onPage={(numero) => {
                  void navigate({
                    search: (previa) => ({ ...previa, page: numero }),
                  })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            </>
          )}
        </div>
      </section>
    </>
  )
}

function Alternativa({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type='button'
      aria-pressed={activa}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-site-meta transition-colors',
        activa
          ? 'bg-site-primary-container text-site-on-primary'
          : 'bg-site-inverse-on-surface text-site-on-surface hover:bg-site-surface-container-high'
      )}
    >
      {children}
    </button>
  )
}
