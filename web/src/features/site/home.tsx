import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileDown } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getHome, getSite, type PublicHome, type PublicSite } from './api'
import { PostCard } from './components/post-card'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SiteButton, SiteButtonLink } from './components/site-button'
import { SectionHeading, SiteSection } from './components/site-section'
import { BLOG, NOTICIAS, type PaginaDeEntradas } from './post-pages'
import {
  useSectionBackground,
  useSectionHeading,
} from './use-section-background'
import { useSiteMeta } from './use-site-meta'

/**
 * Portada del sitio publico: quien es el titular, no que ha publicado.
 *
 * Nacio como escaparate del trabajo academico —carrusel de publicaciones, destacados,
 * docencia y agenda— y eso ya lo cuentan Research, Teaching y Events, cada una en su
 * pagina. Aqui quedan las bandas que responden a una sola pregunta.
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
      {seVe('hero') && (
        <Hero home={home} researchVisible={site?.pages.research === true} />
      )}
      {seVe('about') && <Biografia home={home} />}
      {seVe('research_areas') && <Dominios home={home} />}
      {seVe('appointments') && <Trayectoria home={home} />}
      {seVe('latest_news') && (
        <GrupoDeEntradas
          pagina={NOTICIAS}
          entradas={home.latestPosts.news}
          tone='raised'
        />
      )}
      {seVe('latest_blog') && (
        <GrupoDeEntradas
          pagina={BLOG}
          entradas={home.latestPosts.blog}
          tone='sunken'
        />
      )}
    </>
  )
}

function Hero({
  home,
  researchVisible,
}: {
  home: PublicHome
  researchVisible: boolean
}) {
  const { profile, page } = home
  // El antetitulo lo escribe el titular; si lo deja vacio, el departamento de su
  // afiliacion principal dice lo mismo sin que tenga que teclearlo dos veces.
  const antetitulo =
    page?.eyebrow ?? profile.primaryAffiliation?.department ?? null
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

          {(profile.cvUrl !== null || researchVisible) && (
            <div className='flex flex-wrap gap-4 pt-4'>
              {/* El CV se elige en Perfil academico. Sin uno marcado visible en el
                  sitio no hay boton: mejor que uno que lleve a un 404. */}
              {profile.cvUrl !== null && (
                <SiteButton href={profile.cvUrl} download>
                  <FileDown aria-hidden className='size-4' />
                  CV
                </SiteButton>
              )}
              {/* Solo si esa pagina esta encendida en Configuracion del sitio, igual
                  que el enlace de la cabecera. */}
              {researchVisible && (
                <SiteButtonLink
                  to='/research'
                  variant='outline'
                  // El boton de borde es azul oscuro, que sobre una foto oscurecida
                  // apenas se distingue. Con imagen detras se invierte, como ya hace
                  // el resto del texto de la banda. El de al lado no lo necesita: es
                  // solido y su relleno le da el contraste.
                  className={cn(
                    sobreImagen &&
                      'border-site-on-primary text-site-on-primary hover:bg-site-on-primary/10'
                  )}
                >
                  Research
                </SiteButtonLink>
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
  // El titular puede renombrar la banda desde Contenido de paginas; si no lo hace,
  // queda el rotulo de la plantilla.
  const rotulo = useSectionHeading('home.research_areas', {
    title: 'Research lines',
    aside: 'Main areas',
  })

  // Vacia cuando el titular oculta la portada en Contenido de paginas.
  if (home.page === null || home.page.secondaryHtml === null) return null

  return (
    <SiteSection tone='raised' backgroundKey='home.research_areas'>
      <SectionHeading
        title={rotulo.title}
        aside={rotulo.aside}
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

/**
 * Quien es: la entradilla de la portada y la biografia larga.
 *
 * La biografia se escribe en Perfil academico y hasta ahora no se pintaba en ninguna
 * pagina: se guardaba y se tiraba. La entradilla es el `introMarkdown` de la portada,
 * que vivia dentro de la banda de Docencia y se habria quedado huerfano al retirarla.
 */
function Biografia({ home }: { home: PublicHome }) {
  const { profile, page } = home
  const sobreImagen = useSectionBackground('home.about') !== null
  const rotulo = useSectionHeading('home.about', { title: 'About' })

  // Nada que contar: ni entradilla ni biografia. La banda no se pinta en lugar de
  // dejar un encabezado sobre el vacio.
  if (page?.introHtml == null && profile.fullBioHtml === null) return null

  return (
    <SiteSection tone='raised' backgroundKey='home.about'>
      <SectionHeading
        title={rotulo.title}
        aside={rotulo.aside}
        dark={sobreImagen}
      />

      <div className='grid gap-12 md:grid-cols-12'>
        {page?.introHtml != null && (
          <RichText
            html={page.introHtml}
            className={cn(
              'text-site-body-lg leading-relaxed font-light italic md:col-span-5',
              sobreImagen
                ? 'text-site-on-primary/85'
                : 'text-site-on-surface-variant'
            )}
          />
        )}

        {profile.fullBioHtml !== null && (
          <RichText
            html={profile.fullBioHtml}
            className={cn(
              // Sin entradilla ocupa el ancho entero: dejar media banda vacia se leeria
              // como que falta algo.
              page?.introHtml == null ? 'md:col-span-12' : 'md:col-span-7',
              '[&_p]:mb-4',
              sobreImagen
                ? 'text-site-on-primary/85'
                : 'text-site-on-surface-variant'
            )}
          />
        )}
      </div>
    </SiteSection>
  )
}

/** Un rango de anos, con «presente» cuando el cargo sigue vigente. */
function periodo(
  afiliacion: PublicHome['profile']['affiliations'][number]
): string {
  const anio = (fecha: string | null) =>
    fecha === null ? null : fecha.slice(0, 4)
  const desde = anio(afiliacion.startDate)
  // `isCurrent` y no «sin fecha de fin»: un cargo puede seguir vigente sin que nadie
  // sepa cuando acabara, y son dos cosas distintas.
  const hasta = afiliacion.isCurrent ? 'Present' : anio(afiliacion.endDate)

  if (desde === null) return hasta ?? ''
  if (hasta === null || hasta === desde) return desde
  return `${desde} — ${hasta}`
}

/**
 * La trayectoria: donde esta y donde ha estado.
 *
 * El orden llega resuelto del servidor —vigente primero y dentro de eso lo mas
 * reciente—, asi que aqui no se reordena nada.
 */
function Trayectoria({ home }: { home: PublicHome }) {
  const sobreImagen = useSectionBackground('home.appointments') !== null
  const rotulo = useSectionHeading('home.appointments', {
    title: 'Appointments',
  })
  const { affiliations } = home.profile

  if (affiliations.length === 0) return null

  return (
    <SiteSection tone='sunken' backgroundKey='home.appointments'>
      <SectionHeading
        title={rotulo.title}
        aside={rotulo.aside}
        dark={sobreImagen}
      />

      <ol className='flex flex-col'>
        {affiliations.map((afiliacion, indice) => (
          <li
            key={`${afiliacion.institution}-${afiliacion.title}-${String(indice)}`}
            className={cn(
              'grid gap-2 border-t py-6 md:grid-cols-12 md:gap-8',
              sobreImagen
                ? 'border-site-on-primary/10'
                : 'border-site-outline-variant/20',
              // La primera no lleva filete arriba: el encabezado ya trae el suyo.
              indice === 0 && 'border-t-0 pt-0'
            )}
          >
            <span
              className={cn(
                'text-site-meta tracking-widest uppercase md:col-span-3',
                sobreImagen
                  ? 'text-site-on-primary/70'
                  : 'text-site-on-surface-variant'
              )}
            >
              {periodo(afiliacion)}
            </span>

            <div className='md:col-span-9'>
              <h3
                className={cn(
                  'font-site-display text-site-headline-sm',
                  sobreImagen ? 'text-site-on-primary' : 'text-site-primary'
                )}
              >
                {afiliacion.title}
              </h3>
              <p
                className={cn(
                  sobreImagen
                    ? 'text-site-on-primary/85'
                    : 'text-site-on-surface-variant'
                )}
              >
                {[afiliacion.institution, afiliacion.department]
                  .filter((parte) => parte !== null && parte !== '')
                  .join(' · ')}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SiteSection>
  )
}

/**
 * Una banda con lo ultimo de un tipo.
 *
 * Se pinta una por tipo y no una sola con los dos: son dos bloques distintos de la
 * pagina, cada uno con su fondo, su rotulo y su interruptor. Si su grupo llega vacio no
 * se pinta, que es lo que pasa cuando su pagina esta apagada o no hay nada publicado.
 */
function GrupoDeEntradas({
  pagina,
  entradas,
  tone,
}: {
  pagina: PaginaDeEntradas
  entradas: PublicHome['latestPosts']['news']
  tone: 'raised' | 'sunken'
}) {
  const clave = `home.latest_${pagina.pageKey}`
  const sobreImagen = useSectionBackground(clave) !== null
  const rotulo = useSectionHeading(clave, { title: pagina.titulo })

  if (entradas.length === 0) return null

  return (
    <SiteSection tone={tone} backgroundKey={clave}>
      <SectionHeading
        title={rotulo.title}
        dark={sobreImagen}
        // El aside del encabezado ya viene en versalitas: aqui basta con hacerlo enlace,
        // sin un boton que compita con el titulo de la banda.
        aside={
          <Link
            to={pagina.ruta}
            className='underline-offset-4 transition-colors hover:underline'
          >
            See all
          </Link>
        }
      />
      <div className='flex flex-col gap-6'>
        {entradas.map((entrada) => (
          <PostCard key={entrada.id} post={entrada} pagina={pagina} />
        ))}
      </div>
    </SiteSection>
  )
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
