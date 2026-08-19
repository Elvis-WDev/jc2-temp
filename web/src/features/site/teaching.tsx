import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import {
  getPageContent,
  getSite,
  listTeaching,
  type TeachingFacets,
  type TeachingQuery,
} from './api'
import { CourseCard } from './components/course-card'
import { ImagenDeCabecera } from './components/hero-image'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SitePagination } from './components/site-pagination'
import { fondoDeCabecera } from './page-heroes'
import { agrupar } from './teaching-groups'
import { useSectionBackground } from './use-section-background'
import { resumirHtml, titulo, useSiteMeta } from './use-site-meta'

/**
 * Docencia.
 *
 * Se agrupa por nivel, como la plantilla. El titulo de cada grupo, su orden y su
 * entradilla salen del catalogo `course_level`, que el titular edita: si estuvieran
 * escritos aqui, serian lo unico de la web que no se puede cambiar desde el panel.
 *
 * ERS §54 dice que agrupar es una decision de presentacion y que **no implica** que el
 * modelo use esa jerarquia. El nivel sigue siendo texto libre en el curso.
 */

const route = getRouteApi('/_public/teaching/')

/** Los cursos de un titular caben de sobra; con mas, aparece la paginacion. */
const POR_PAGINA = 50

export function SiteTeaching() {
  const busqueda = route.useSearch()
  const navigate = route.useNavigate()

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const { data: page } = useQuery({
    queryKey: queryKeys.public.page('teaching'),
    queryFn: () => getPageContent('teaching'),
    staleTime: 5 * 60_000,
  })

  const consulta: TeachingQuery = { ...busqueda, page_size: POR_PAGINA }
  const {
    data: resultado,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.teaching(consulta),
    queryFn: () => listTeaching(consulta),
    staleTime: 60_000,
  })

  useSiteMeta({
    title: titulo(page?.pageTitle ?? 'Teaching', site?.siteName),
    description: resumirHtml(page?.introHtml ?? null),
    path: '/teaching',
    imageUrl: site?.meta.ogImageUrl ?? null,
  })

  const cambiar = (cambio: Partial<TeachingQuery>) => {
    void navigate({ search: (previa) => ({ ...previa, ...cambio, page: 1 }) })
  }

  const hayFiltros =
    busqueda.q !== undefined ||
    busqueda.institution !== undefined ||
    busqueda.active === true

  return (
    <>
      <Cabecera page={page ?? null} />

      <section className='w-full bg-site-surface-bright px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto max-w-site space-y-16'>
          {site?.sections['teaching.filters'] !== false &&
            resultado !== undefined && (
              <Filtros
                facets={resultado.facets}
                busqueda={busqueda}
                onChange={cambiar}
                hayFiltros={hayFiltros}
                onLimpiar={() => {
                  void navigate({ search: { sort: busqueda.sort, page: 1 } })
                }}
              />
            )}

          {isPending && (
            <p className='text-site-on-surface-variant'>Loading...</p>
          )}

          {isError && (
            <p className='text-site-on-surface-variant'>
              The courses could not be loaded. Please try again in a moment.
            </p>
          )}

          {resultado !== undefined && resultado.items.length === 0 && (
            // ERS §55: el ejemplo del propio ERS para esta pagina.
            <div className='flex flex-col items-start gap-4 py-12'>
              <p className='font-site-display text-site-headline-sm text-site-primary'>
                {busqueda.active === true
                  ? 'No course is running at the moment.'
                  : 'No course matches the filters you chose.'}
              </p>
              {hayFiltros && (
                <button
                  type='button'
                  onClick={() => {
                    void navigate({ search: { sort: busqueda.sort, page: 1 } })
                  }}
                  className='text-site-label text-site-primary uppercase underline underline-offset-4'
                >
                  See all courses
                </button>
              )}
            </div>
          )}

          {resultado !== undefined &&
            agrupar(resultado.items, resultado.facets).map((grupo) => (
              <div
                key={grupo.code}
                className='grid grid-cols-1 gap-site-gutter md:grid-cols-12'
              >
                <div className='md:col-span-3'>
                  <div className='md:sticky md:top-24'>
                    <h2 className='flex items-center gap-2 font-site-display text-site-headline-sm text-site-primary'>
                      <span
                        aria-hidden
                        className='block h-px w-6 bg-site-on-tertiary-container'
                      />
                      {grupo.label}
                    </h2>
                    {grupo.description !== null && (
                      <p className='mt-4 hidden text-site-on-surface-variant md:block'>
                        {grupo.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className='space-y-8 md:col-span-8 md:col-start-5'>
                  {grupo.cursos.map((curso) => (
                    <CourseCard key={curso.id} course={curso} />
                  ))}
                </div>
              </div>
            ))}

          {resultado !== undefined && (
            <SitePagination
              pagination={resultado.pagination}
              onPage={(page) => {
                void navigate({ search: (previa) => ({ ...previa, page }) })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
        </div>
      </section>
    </>
  )
}

function Cabecera({
  page,
}: {
  page: {
    pageTitle: string | null
    eyebrow: string | null
    introHtml: string | null
    heroUrl: string | null
    heroAlt: string | null
  } | null
}) {
  // Sobre una foto oscurecida el texto oscuro no se lee: la cabecera entera se invierte.
  const sobreImagen = useSectionBackground('teaching.header') !== null

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden px-site-margin py-site-section lg:px-site-gutter',
        sobreImagen ? 'text-site-on-primary' : fondoDeCabecera('teaching')
      )}
    >
      <SectionBackground clave='teaching.header' />

      <div className='relative z-10 mx-auto grid max-w-site grid-cols-1 items-center gap-site-gutter md:grid-cols-12'>
        {/* El texto a la izquierda, no centrado: con una ilustracion al lado, un titulo
            centrado se descuelga de su propia columna. */}
        <div className='space-y-6 md:col-span-7'>
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
              'font-site-display text-site-display-sm md:text-site-display-lg',
              sobreImagen ? 'text-site-on-primary' : 'text-site-primary'
            )}
          >
            {page?.pageTitle ?? 'Teaching'}
          </h1>
          <RichText
            html={page?.introHtml ?? null}
            className={cn(
              'max-w-2xl text-site-body-lg leading-relaxed',
              sobreImagen
                ? 'text-site-on-primary/85'
                : 'text-site-on-surface-variant'
            )}
          />
        </div>

        {page?.heroUrl != null && (
          <ImagenDeCabecera url={page.heroUrl} alt={page.heroAlt} />
        )}
      </div>
    </section>
  )
}

/**
 * Barra de filtros.
 *
 * La plantilla de Docencia no trae ninguna, pero el titular puede encenderla desde
 * Configuracion del sitio. Es una sola linea, no una barra lateral: la pagina ya tiene
 * dos columnas por grupo y una tercera la partiria.
 */
function Filtros({
  facets,
  busqueda,
  onChange,
  hayFiltros,
  onLimpiar,
}: {
  facets: TeachingFacets
  busqueda: TeachingQuery
  onChange: (cambio: Partial<TeachingQuery>) => void
  hayFiltros: boolean
  onLimpiar: () => void
}) {
  return (
    <div className='flex flex-wrap items-center gap-4 border-b border-site-outline-variant pb-6'>
      <form
        role='search'
        className='relative min-w-56 flex-1'
        onSubmit={(evento) => {
          evento.preventDefault()
          const campo = evento.currentTarget.elements.namedItem('q')
          if (campo instanceof HTMLInputElement) {
            const valor = campo.value.trim()
            onChange({ q: valor === '' ? undefined : valor })
          }
        }}
      >
        <Search
          aria-hidden
          className='absolute start-3 top-1/2 size-4 -translate-y-1/2 text-site-on-surface-variant/50'
        />
        <input
          name='q'
          type='search'
          key={busqueda.q ?? ''}
          defaultValue={busqueda.q ?? ''}
          aria-label='Search courses'
          placeholder='Search courses...'
          className='w-full rounded-site border border-site-outline-variant bg-site-surface py-2 ps-10 pe-4 text-site-on-surface placeholder:text-site-on-surface-variant/50 focus-visible:border-site-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-primary'
        />
      </form>

      {facets.institutions.length > 1 && (
        <select
          aria-label='Filter by institution'
          value={busqueda.institution ?? ''}
          onChange={(evento) => {
            onChange({
              institution:
                evento.target.value === '' ? undefined : evento.target.value,
            })
          }}
          className='cursor-pointer rounded-site border border-site-outline-variant bg-site-surface px-3 py-2 text-site-on-surface focus-visible:border-site-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-primary'
        >
          <option value=''>All institutions</option>
          {facets.institutions.map((institucion) => (
            <option key={institucion.slug} value={institucion.slug}>
              {institucion.name} ({institucion.count})
            </option>
          ))}
        </select>
      )}

      <button
        type='button'
        aria-pressed={busqueda.active === true}
        onClick={() => {
          onChange({ active: busqueda.active === true ? undefined : true })
        }}
        className={cn(
          'rounded-site border px-3 py-2 text-site-label uppercase transition-colors',
          busqueda.active === true
            ? 'border-site-primary bg-site-primary text-site-on-primary'
            : 'border-site-outline-variant text-site-on-surface-variant hover:text-site-on-surface'
        )}
      >
        Running only
      </button>

      {hayFiltros && (
        <button
          type='button'
          onClick={onLimpiar}
          className='text-site-meta text-site-on-surface-variant underline decoration-dotted hover:text-site-primary'
        >
          Clear
        </button>
      )}
    </div>
  )
}
