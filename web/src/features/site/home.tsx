import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getHome, getSite, type PublicHome, type PublicSite } from './api'
import { EventGrid } from './components/event-grid'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SiteButton } from './components/site-button'
import { SiteCard, SiteChip } from './components/site-card'
import { SectionHeading, SiteSection } from './components/site-section'
import { WorkCarousel } from './components/work-carousel'
import { useSectionBackground } from './use-section-background'
import { useSiteMeta } from './use-site-meta'
import { coautores } from './work-format'

/**
 * Portada del sitio publico, con el diseno de `docs/design/plantillas-webprincipal/`.
 *
 * Una sola peticion (ERS §30, PERF-003). Las secciones que el titular apaga en
 * Configuracion del sitio no se pintan, y las que estan encendidas pero vacias
 * explican por que lo estan (ERS §55).
 */
export function SiteHome() {
  const {
    data: home,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.home,
    queryFn: getHome,
    // El contenido publico cambia cuando el titular publica, no cada segundo.
    staleTime: 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  useSiteMeta(home === undefined ? null : metadatosDePortada(home, site))

  if (isPending) {
    return (
      <SiteSection>
        <p className='text-site-on-surface-variant'>Loading...</p>
      </SiteSection>
    )
  }

  if (isError) {
    return (
      <SiteSection>
        <p className='font-site-display text-site-headline-sm text-site-primary'>
          The content could not be loaded.
        </p>
        <p className='mt-2 text-site-on-surface-variant'>
          Please try again in a moment.
        </p>
      </SiteSection>
    )
  }

  // Sin fila, visible: anadir una seccion no obliga a tocar la base de datos.
  const seVe = (seccion: string) => home.sections[seccion] !== false

  return (
    <>
      {/* Sin separador debajo del hero: el friso esta dibujado para fondo claro, y
          entre dos bandas oscuras —el hero con imagen y el carrusel— aparecia como una
          franja blanca que parecia un hueco. Las demas paginas si lo llevan, porque
          alli separa bandas claras. */}
      {seVe('hero') && <Hero home={home} />}
      {seVe('research_areas') && <Dominios home={home} />}
      {seVe('carousel') && (
        <WorkCarousel
          works={home.carouselWorks}
          ownerName={home.profile.fullName}
        />
      )}
      {seVe('featured_works') && <TrabajosDestacados home={home} />}
      {seVe('featured_courses') && <Docencia home={home} />}
      {seVe('events') && (
        <EventosDePortada
          home={home}
          agendaVisible={site?.pages.events === true}
        />
      )}
    </>
  )
}

function Hero({ home }: { home: PublicHome }) {
  const { profile, page } = home
  // El antetitulo lo escribe el titular; si lo deja vacio, el departamento de su
  // afiliacion principal dice lo mismo sin que tenga que teclearlo dos veces.
  const antetitulo =
    page?.eyebrow ?? profile.primaryAffiliation?.department ?? null
  const hayDestacados =
    home.sections.featured_works !== false && home.featuredWorks.length > 0
  // Sobre una foto oscurecida el texto oscuro no se lee: la banda entera se invierte.
  const sobreImagen = useSectionBackground('home.hero') !== null

  return (
    <section
      className={cn(
        'relative overflow-hidden py-site-section',
        sobreImagen && 'text-site-on-primary'
      )}
    >
      <SectionBackground clave='home.hero' />

      <div className='relative z-10 mx-auto flex max-w-site flex-col items-start gap-12 px-site-margin md:flex-row md:items-center lg:gap-24 lg:px-site-gutter'>
        <div className='flex-1 space-y-6'>
          {antetitulo !== null && (
            <p
              className={cn(
                'text-site-label tracking-[0.2em] uppercase',
                sobreImagen ? 'text-site-on-primary/70' : 'text-site-primary'
              )}
            >
              {antetitulo}
            </p>
          )}

          <h1
            className={cn(
              'font-site-display text-site-display-sm text-balance md:text-site-display-lg',
              sobreImagen ? 'text-site-on-primary' : 'text-site-primary'
            )}
          >
            {profile.fullName}
          </h1>

          {profile.professionalTitle !== null && (
            <p
              className={cn(
                'text-site-meta tracking-widest uppercase',
                sobreImagen
                  ? 'text-site-on-primary/70'
                  : 'text-site-on-surface-variant'
              )}
            >
              {profile.professionalTitle}
            </p>
          )}

          {profile.shortBio !== null && (
            <p
              className={cn(
                'max-w-2xl text-site-body-lg leading-relaxed',
                sobreImagen
                  ? 'text-site-on-primary/85'
                  : 'text-site-on-surface-variant'
              )}
            >
              {profile.shortBio}
            </p>
          )}

          {(hayDestacados || profile.cvUrl !== null) && (
            <div className='flex flex-wrap gap-4 pt-4'>
              {hayDestacados && (
                <SiteButton href='#works'>Selected work</SiteButton>
              )}
              {profile.cvUrl !== null && (
                <SiteButton href={profile.cvUrl} variant='outline'>
                  View CV
                </SiteButton>
              )}
            </div>
          )}
        </div>

        {profile.photoUrl !== null && (
          // El contenedor se ajusta a la imagen: sin respaldo desplazado detras y sin
          // proporcion forzada. El respaldo asomaba por la derecha y por abajo como un
          // margen, y `aspect-square` recortaba un retrato apaisado.
          <div className='w-full shrink-0 md:w-[400px] lg:w-[480px]'>
            <img
              // El texto alternativo es el nombre porque es un retrato: describir
              // "foto de perfil" no le dice nada a quien usa un lector de pantalla.
              alt={profile.fullName}
              src={profile.photoUrl}
              className='block w-full rounded-site shadow-xl'
            />
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Las lineas de investigacion, que se escriben en Contenido de paginas → Portada.
 *
 * La plantilla dibuja tres columnas con un filete a la izquierda. Aqui el contenido es
 * Markdown libre, asi que se reparte en columnas de texto en lugar de en tres cajas
 * fijas: si escribe tres apartados sale igual que la plantilla, y si escribe dos o
 * cuatro tambien funciona en vez de romperse.
 */
function Dominios({ home }: { home: PublicHome }) {
  const sobreImagen = useSectionBackground('home.research_areas') !== null

  // Vacia cuando el titular oculta la portada en Contenido de paginas.
  if (home.page === null || home.page.secondaryHtml === null) return null

  return (
    <SiteSection tone='raised' backgroundKey='home.research_areas'>
      <SectionHeading
        title='Research lines'
        aside='Main areas'
        dark={sobreImagen}
      />
      <RichText
        html={home.page.secondaryHtml}
        className={[
          'gap-12 md:columns-2 lg:columns-3',
          '[&_h1]:font-site-display [&_h2]:font-site-display [&_h3]:font-site-display',
          '[&_h1]:text-site-headline-sm [&_h2]:text-site-headline-sm [&_h3]:text-site-headline-sm',
          sobreImagen
            ? '[&_h1]:text-site-on-primary [&_h2]:text-site-on-primary [&_h3]:text-site-on-primary'
            : '[&_h1]:text-site-primary [&_h2]:text-site-primary [&_h3]:text-site-primary',
          '[&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-3',
          // Un titulo nunca se queda solo al final de una columna, separado del
          // parrafo que explica.
          '[&_h1]:break-after-avoid [&_h2]:break-after-avoid [&_h3]:break-after-avoid',
          '[&_p]:mb-6 [&_p]:break-inside-avoid',
          sobreImagen
            ? '[&_p]:text-site-on-primary/85'
            : '[&_p]:text-site-on-surface-variant',
          '[&_ul]:mb-6 [&_ul]:list-disc [&_ul]:break-inside-avoid [&_ul]:ps-5',
          '[&_a]:underline [&_a]:decoration-site-on-tertiary-container',
        ].join(' ')}
      />
    </SiteSection>
  )
}

function TrabajosDestacados({ home }: { home: PublicHome }) {
  // Las tarjetas son opacas: sobre una foto siguen leyendose igual. Solo el encabezado,
  // que va directo sobre la banda, tiene que cambiar de color.
  const sobreImagen = useSectionBackground('home.featured_works') !== null

  return (
    <SiteSection id='works' tone='sunken' backgroundKey='home.featured_works'>
      <SectionHeading
        dark={sobreImagen}
        title='Selected publications'
        aside={
          home.featuredWorks.length > 0
            ? `${home.featuredWorks.length} works`
            : undefined
        }
      />

      {home.featuredWorks.length === 0 ? (
        // ERS §55: una seccion vacia se explica, no se deja en blanco.
        <p className='text-site-on-surface-variant'>No featured work yet.</p>
      ) : (
        <div className='grid gap-8 lg:grid-cols-2'>
          {home.featuredWorks.map((trabajo) => (
            <SiteCard
              key={trabajo.id}
              className='flex flex-col justify-between p-8'
            >
              <div>
                <div className='mb-4 flex flex-wrap items-center gap-3'>
                  {trabajo.year !== null && (
                    <SiteChip tone='accent'>{trabajo.year}</SiteChip>
                  )}
                  <span className='truncate text-site-meta text-site-on-surface-variant'>
                    {trabajo.venue ?? trabajo.type.label}
                  </span>
                </div>

                <h3 className='mb-4 font-site-display text-site-headline-sm text-site-primary transition-colors group-hover:text-site-on-tertiary-fixed-variant'>
                  {trabajo.title}
                </h3>

                {trabajo.subtitle !== null && (
                  <p className='mb-6 text-site-on-surface-variant'>
                    {trabajo.subtitle}
                  </p>
                )}
              </div>

              <div className='flex items-center justify-between gap-4 border-t border-site-outline-variant/20 pt-4'>
                <span className='text-site-meta text-site-on-surface-variant'>
                  {coautores(trabajo.authors, home.profile.fullName)}
                </span>
                {trabajo.doiUrl !== null && (
                  <a
                    href={trabajo.doiUrl}
                    className='flex items-center gap-1 text-site-label text-site-primary uppercase transition-colors hover:text-site-on-tertiary-fixed-variant'
                  >
                    DOI <ArrowUpRight className='size-4' />
                  </a>
                )}
              </div>
            </SiteCard>
          ))}
        </div>
      )}
    </SiteSection>
  )
}

function Docencia({ home }: { home: PublicHome }) {
  return (
    <section className='relative overflow-hidden bg-site-primary py-site-section text-site-on-primary'>
      {/* Ya es una banda oscura con texto claro: la imagen entra sin invertir nada. */}
      <SectionBackground clave='home.featured_courses' />
      {/* Sesgo decorativo de la plantilla, con degradado en vez de imagen. */}
      <div
        aria-hidden
        className='pointer-events-none absolute top-0 -right-[10%] h-full w-[50%] skew-x-12 bg-gradient-to-l from-site-on-primary/5 to-transparent'
      />

      <div className='relative z-10 mx-auto grid max-w-site grid-cols-1 items-center gap-12 px-site-margin lg:grid-cols-12 lg:px-site-gutter'>
        <div className='space-y-6 border-l-4 border-site-on-tertiary-container ps-6 md:ps-8 lg:col-span-5'>
          <h2 className='font-site-display text-site-headline-md text-site-on-primary'>
            Teaching
          </h2>
          <RichText
            html={home.page?.introHtml ?? null}
            className='text-site-body-lg leading-relaxed font-light text-site-on-primary/80 italic'
          />
        </div>

        <div className='lg:col-span-6 lg:col-start-7'>
          <h3 className='mb-6 text-site-label tracking-widest text-site-on-primary/60 uppercase'>
            Current courses
          </h3>

          {home.featuredCourses.length === 0 ? (
            <p className='text-site-on-primary/70'>No featured courses yet.</p>
          ) : (
            <ul className='space-y-4'>
              {home.featuredCourses.map((curso) => (
                <li
                  key={curso.id}
                  className='-mx-4 flex items-center justify-between border-b border-site-on-primary/10 px-4 py-4 transition-colors hover:bg-site-on-primary/5'
                >
                  <div>
                    <h4 className='text-site-body-lg text-site-on-primary'>
                      {curso.title}
                    </h4>
                    <p className='text-site-on-primary/70'>
                      {periodo(curso.currentOffering)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Los eventos, en rejilla, al final de la portada.
 *
 * Muestra los proximos; y si no hay ninguno por venir, los ultimos celebrados, para que
 * la seccion no quede vacia mientras haya historia que ensenar. Eso lo resuelve la API.
 *
 * Sin ningun evento publicado no se pinta. No hace falta apagarla, aunque tambien se
 * pueda desde Contenido de paginas.
 */
function EventosDePortada({
  home,
  agendaVisible,
}: {
  home: PublicHome
  agendaVisible: boolean
}) {
  const sobreImagen = useSectionBackground('home.events') !== null

  if (home.events.length === 0) return null

  const hayProximos = home.events.some(
    (evento) => new Date(evento.startsAt) >= new Date()
  )

  return (
    <SiteSection tone='raised' backgroundKey='home.events'>
      <SectionHeading
        dark={sobreImagen}
        title={hayProximos ? 'Upcoming events' : 'Past events'}
        aside={
          // No se enlaza lo que no se puede abrir: con la pagina oculta, /events da 404.
          agendaVisible ? (
            <Link to='/events' className='hover:underline'>
              See the full agenda
            </Link>
          ) : undefined
        }
      />

      <EventGrid events={home.events} />
    </SiteSection>
  )
}

function periodo(
  edicion: PublicHome['featuredCourses'][number]['currentOffering']
): string {
  if (edicion === null) return 'No published offerings'
  return [edicion.institution, edicion.term, edicion.academicYear]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Lo que se ve en la pestana, al compartir el enlace y en un buscador.
 *
 * Los valores por defecto salen de Configuracion del sitio; si estan vacios, se cae al
 * nombre y la biografia del titular, que siempre estan.
 */
function metadatosDePortada(home: PublicHome, site: PublicSite | undefined) {
  const { profile } = home

  return {
    title: site?.meta.title ?? site?.siteName ?? profile.fullName,
    description: site?.meta.description ?? profile.shortBio,
    path: '/',
    imageUrl: site?.meta.ogImageUrl ?? profile.photoUrl,
    // JSON-LD Person (ERS §39): es lo que permite a un buscador entender que esta web
    // es de una persona concreta y enlazarla con su ORCID.
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.fullName,
      jobTitle: profile.professionalTitle,
      description: profile.shortBio,
      email:
        profile.publicEmail === null
          ? undefined
          : `mailto:${profile.publicEmail}`,
      image: profile.photoUrl ?? undefined,
      affiliation:
        profile.primaryAffiliation === null
          ? undefined
          : {
              '@type': 'Organization',
              name: profile.primaryAffiliation.institution,
            },
      sameAs: [
        profile.orcid === null ? null : `https://orcid.org/${profile.orcid}`,
        profile.scholarUrls.googleScholar,
        profile.scholarUrls.scopus,
        profile.scholarUrls.ssrn,
        profile.scholarUrls.repec,
        profile.scholarUrls.website,
        ...profile.links.map((enlace) => enlace.url),
      ].filter((url) => url !== null),
    },
  }
}
