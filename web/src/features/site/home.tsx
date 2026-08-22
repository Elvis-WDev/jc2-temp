import { useQuery } from '@tanstack/react-query'
import { FileDown } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getHome, getSite, type PublicHome, type PublicSite } from './api'
import { PostCard } from './components/post-card'
import { PostCarousel } from './components/post-carousel'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SiteButton, SiteButtonLink } from './components/site-button'
import { SectionHeading, SiteSection } from './components/site-section'
import { fondoDeCabecera } from './page-heroes'
import { NOTICIAS, type PaginaDeEntradas } from './post-pages'
import {
  useSectionBackground,
  useSectionHeading,
} from './use-section-background'
import { useSiteMeta } from './use-site-meta'

type Tono = 'brand' | 'default' | 'blank'

/**
 * El turno de colores de las bandas.
 *
 * El hero se queda con el fondo de la pagina; a partir de ahi se alternan el solido del
 * encabezado y ese mismo fondo. Sobre el solido el texto oscuro no se lee, asi que la
 * banda que lo lleva se invierte entera, igual que ya hacia la que tiene una foto detras.
 *
 * Se calcula sobre las bandas que **de verdad se pintan**, no sobre una lista fija: una
 * banda se puede apagar desde el panel y otra desaparece sola cuando no tiene nada que
 * ensenar. Con los colores escritos banda a banda, ocultar una dejaba dos seguidas del
 * mismo color sin que nadie lo notase hasta verlo.
 *
 * El pie lleva ese mismo solido, asi que cuando el numero de bandas hace que la ultima
 * caiga en solido, las dos se tocan. No se resuelve con el color —empezar en claro para
 * acabar en oscuro dejaria el hero y la primera banda iguales— sino con el filete que
 * lleva el pie en su borde superior.
 */
/**
 * Las bandas que no entran en el turno, con el color que llevan siempre.
 *
 * El carrusel de noticias va sobre blanco: se decidio asi para que la portada y la
 * imagen se lean sobre un fondo limpio, sin el hueso del resto de la pagina. Al quedar
 * fuera del turno, las demas siguen alternando entre ellas sin contarla.
 */
const TONO_FIJO: Partial<Record<string, Tono>> = {
  image: 'brand',
  latest_news: 'blank',
}

function turnoDeColores(cuantas: number): Tono[] {
  // Desde arriba: el hero se queda con el fondo de la pagina, asi que la primera banda
  // que viene detras es la del solido.
  return Array.from({ length: cuantas }, (_, indice) =>
    indice % 2 === 0 ? 'brand' : 'default'
  )
}

/** Si la banda va invertida: por su color solido, o por la foto que tenga detras. */
function useBandaInvertida(clave: string, tono: Tono): boolean {
  return useSectionBackground(clave) !== null || tono === 'brand'
}

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

  // Que bandas se pintan, en orden. Una encendida pero vacia no cuenta: no se dibuja, y
  // dejarle su turno de color descuadraria las de debajo.
  const bandas = [
    seVe('image') && home.page?.heroUrl != null ? 'image' : null,
    seVe('research_areas') && home.page?.secondaryHtml != null
      ? 'research_areas'
      : null,
    // Las noticias cierran la portada, y en carrusel: es lo ultimo que pasa y lo que
    // conviene que quede a la vista al final del recorrido.
    seVe('latest_news') && home.latestNews.length > 0 ? 'latest_news' : null,
  ].filter((banda): banda is string => banda !== null)

  const alternan = bandas.filter((banda) => TONO_FIJO[banda] === undefined)
  const turno = turnoDeColores(alternan.length)
  const tono = (banda: string): Tono =>
    TONO_FIJO[banda] ?? turno[alternan.indexOf(banda)] ?? 'default'

  return (
    <>
      {seVe('hero') && (
        <Hero home={home} researchVisible={site?.pages.research === true} />
      )}
      {bandas.includes('image') && (
        <Ilustracion home={home} tone={tono('image')} />
      )}
      {bandas.includes('research_areas') && (
        <Dominios home={home} tone={tono('research_areas')} />
      )}
      {bandas.includes('latest_news') && (
        <GrupoDeEntradas
          pagina={NOTICIAS}
          entradas={home.latestNews}
          tone={tono('latest_news')}
          carrusel
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
        sobreImagen ? 'text-site-on-primary' : fondoDeCabecera('home')
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

          <RedesAcademicas links={profile.links} />
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
 * Una imagen sola, centrada, sobre el solido del encabezado.
 *
 * Sale del campo Imagen de la portada, en Contenido de paginas: la misma columna que en
 * Research y Teaching pinta la ilustracion de la cabecera. Sin imagen elegida la banda
 * no existe, en lugar de una franja de color vacia.
 *
 * **Sin rotulo, y a proposito.** Es la banda de la imagen y nada mas; la que lleva
 * titulo y texto es la de las lineas de investigacion, que va justo debajo y es otra.
 * Mientras esta admitio rotulo, el panel ofrecia el campo con «Research lines» de
 * ejemplo y parecia que las dos fueran la misma cosa.
 */
function Ilustracion({ home, tone }: { home: PublicHome; tone: Tono }) {
  if (home.page?.heroUrl == null) return null

  return (
    <SiteSection tone={tone} backgroundKey='home.image'>
      <div className='flex justify-center'>
        <img
          src={home.page.heroUrl}
          alt={home.page.heroAlt ?? ''}
          // Tope en alto y no en ancho: una ilustracion apaisada llenaria la banda de
          // lado a lado y una vertical la estiraria hasta empujar el resto de la portada
          // fuera de la pantalla. Con el tope en alto, las dos caben igual de bien.
          //
          // 14rem, la mitad de los 28 que tenia: a ese tamano la imagen se comia la
          // banda entera y habia que bajar para ver que venia despues.
          className='max-h-[14rem] w-auto max-w-full rounded-site'
        />
      </div>
    </SiteSection>
  )
}

/**
 * Las redes academicas del titular, bajo los botones del hero.
 *
 * Las gestiona el en Perfil academico -> Enlaces: cuales, en que orden, y el logotipo de
 * cada una. Aqui no hay ninguna lista de servicios conocidos, asi que anadir uno nuevo
 * —o uno que no exista todavia— es una fila mas en el panel y no un cambio de codigo.
 *
 * **Solo salen los que tienen logotipo.** Sin marca no hay nada que ensenar: un enlace
 * vacio seria un hueco que se puede pulsar, y poner el rotulo en su lugar traeria de
 * vuelta el texto que se quiso quitar. El enlace no se pierde: el pie los lista todos
 * por su nombre.
 */
function RedesAcademicas({ links }: { links: PublicHome['profile']['links'] }) {
  const conLogotipo = links.filter((enlace) => enlace.iconUrl !== null)
  if (conLogotipo.length === 0) return null

  return (
    <ul className='flex flex-wrap items-center gap-5 pt-2'>
      {conLogotipo.map((enlace) => {
        const nombre = enlace.label ?? enlace.type
        return (
          <li key={enlace.url}>
            <a
              href={enlace.url}
              target='_blank'
              rel='noopener noreferrer me'
              // El nombre va en el `aria-label` y en el `title`: dentro no queda texto
              // que leer, ni para un lector de pantalla ni para quien pasa el raton.
              aria-label={nombre}
              title={nombre}
              className='block transition-opacity hover:opacity-70'
            >
              <img
                src={enlace.iconUrl as string}
                alt=''
                // Decorativa: el enlace ya se anuncia con su `aria-label`.
                className='size-8 object-contain'
              />
            </a>
          </li>
        )
      })}
    </ul>
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
function Dominios({ home, tone }: { home: PublicHome; tone: Tono }) {
  const invertido = useBandaInvertida('home.research_areas', tone)
  // El titular puede renombrar la banda desde Contenido de paginas; si no lo hace,
  // queda el rotulo de la plantilla.
  // Sin rotulo a la derecha por defecto: el titulo se basta. El titular puede escribir
  // uno desde Contenido de paginas si algun dia quiere.
  const rotulo = useSectionHeading('home.research_areas', {
    title: 'Research lines',
  })

  // Vacia cuando el titular oculta la portada en Contenido de paginas.
  if (home.page === null || home.page.secondaryHtml === null) return null

  return (
    <SiteSection tone={tone} backgroundKey='home.research_areas'>
      <SectionHeading
        title={rotulo.title}
        aside={rotulo.aside}
        dark={invertido}
      />
      <RichText
        html={home.page.secondaryHtml}
        className={[
          'gap-12 md:columns-2 lg:columns-3',
          '[&_h1]:font-site-display [&_h2]:font-site-display [&_h3]:font-site-display',
          '[&_h1]:text-site-headline-sm [&_h2]:text-site-headline-sm [&_h3]:text-site-headline-sm',
          invertido
            ? '[&_h1]:text-site-on-primary [&_h2]:text-site-on-primary [&_h3]:text-site-on-primary'
            : '[&_h1]:text-site-primary [&_h2]:text-site-primary [&_h3]:text-site-primary',
          '[&_h1]:mb-3 [&_h2]:mb-3 [&_h3]:mb-3',
          // Un titulo nunca se queda solo al final de una columna, separado del
          // parrafo que explica.
          '[&_h1]:break-after-avoid [&_h2]:break-after-avoid [&_h3]:break-after-avoid',
          '[&_p]:mb-6 [&_p]:break-inside-avoid',
          invertido
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
  carrusel = false,
}: {
  pagina: PaginaDeEntradas
  entradas: PublicHome['latestNews']
  tone: Tono
  /**
   * De una en una y con flechas, en lugar de una lista.
   *
   * Lo llevan las noticias, que son breves y se leen de un vistazo. El blog se queda en
   * lista: su resumen es mas largo y verlos juntos ayuda a elegir cual abrir.
   */
  carrusel?: boolean
}) {
  const clave = `home.latest_${pagina.pageKey}`
  const invertido = useBandaInvertida(clave, tone)
  const rotulo = useSectionHeading(clave, { title: pagina.titulo })

  if (entradas.length === 0) return null

  return (
    <SiteSection tone={tone} backgroundKey={clave}>
      <SectionHeading
        title={rotulo.title}
        dark={invertido}
        // Sin «See all»: las noticias no tienen listado propio, viven solo aqui. A cada
        // una se llega por su tarjeta.
      />
      {carrusel ? (
        <PostCarousel
          entradas={entradas}
          pagina={pagina}
          invertido={invertido}
        />
      ) : (
        <div className='flex flex-col gap-6'>
          {entradas.map((entrada) => (
            <PostCard key={entrada.id} post={entrada} pagina={pagina} />
          ))}
        </div>
      )}
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
