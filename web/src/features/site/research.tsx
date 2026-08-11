import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import {
  getPageContent,
  getSite,
  listResearch,
  type ResearchFacets,
  type ResearchQuery,
} from './api'
import {
  ResearchFilters,
  type FiltrosResearch,
} from './components/research-filters'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SitePagination } from './components/site-pagination'
import { WorkCard } from './components/work-card'
import { useSectionBackground } from './use-section-background'
import { resumirHtml, titulo, useSiteMeta } from './use-site-meta'

/**
 * Listado publico de trabajos.
 *
 * **Todo el estado vive en la direccion**: busqueda, tipo, estado, etiqueta, ano, orden
 * y pagina. Copiar el enlace reproduce exactamente lo que se esta viendo, el boton de
 * volver funciona y recargar no pierde nada. Es el mismo criterio que ya siguen las
 * tablas del panel.
 *
 * Los filtros se resuelven en el servidor (PERF-001) y los recuentos de cada opcion
 * son las facetas, calculadas sobre el mismo conjunto filtrado.
 */

type Orden = 'newest' | 'oldest' | 'title' | 'relevance'

const route = getRouteApi('/_public/research/')

export function SiteResearch() {
  const busqueda = route.useSearch()
  const navigate = route.useNavigate()

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const { data: page } = useQuery({
    queryKey: queryKeys.public.page('research'),
    queryFn: () => getPageContent('research'),
    staleTime: 5 * 60_000,
  })

  const consulta: ResearchQuery = busqueda
  const {
    data: resultado,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.research(consulta),
    queryFn: () => listResearch(consulta),
    staleTime: 60_000,
  })

  /** Un cambio de filtro o de orden devuelve siempre a la primera pagina. */
  const cambiarFiltros = (
    cambio: Partial<FiltrosResearch & { sort: Orden }>
  ) => {
    void navigate({ search: (previa) => ({ ...previa, ...cambio, page: 1 }) })
  }

  useSiteMeta({
    title: titulo(page?.pageTitle ?? 'Research', site?.siteName),
    description: resumirHtml(page?.introHtml ?? null),
    path: '/research',
    imageUrl: site?.meta.ogImageUrl ?? null,
  })

  const filtrosActivos = describirFiltros(busqueda, resultado?.facets)
  const filtrarVisible = site?.sections['research.filters'] !== false

  return (
    <>
      <Cabecera
        page={page ?? null}
        total={resultado?.pagination.totalItems ?? null}
      />

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto grid max-w-site grid-cols-1 gap-site-gutter lg:grid-cols-12'>
          {filtrarVisible && resultado !== undefined && (
            <ResearchFilters
              facets={resultado.facets}
              filtros={busqueda}
              onChange={cambiarFiltros}
            />
          )}

          <main
            className={
              filtrarVisible
                ? 'flex flex-col gap-8 lg:col-span-9'
                : 'lg:col-span-12'
            }
          >
            <div className='flex flex-wrap items-center justify-between gap-4 border-b border-site-outline-variant pb-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-site-meta text-site-on-surface-variant'>
                  {resultado === undefined
                    ? 'Loading...'
                    : `${resultado.pagination.totalItems} ${
                        resultado.pagination.totalItems === 1
                          ? 'result'
                          : 'results'
                      }`}
                </span>
                {filtrosActivos.map((filtro) => (
                  <button
                    key={filtro.clave}
                    type='button'
                    onClick={() => {
                      cambiarFiltros(filtro.quitar)
                    }}
                    className='inline-flex items-center gap-1 rounded-site bg-site-surface-container px-2 py-1 text-[10px] tracking-wider text-site-on-surface uppercase hover:text-site-error'
                  >
                    {filtro.etiqueta}
                    <X aria-hidden className='size-3' />
                    <span className='sr-only'>Remove filter</span>
                  </button>
                ))}
              </div>

              <div className='flex items-center gap-4'>
                <OrdenarPor
                  valor={busqueda.sort}
                  onChange={(sort) => {
                    cambiarFiltros({ sort })
                  }}
                />
                {filtrosActivos.length > 0 && (
                  <button
                    type='button'
                    onClick={() => {
                      void navigate({
                        search: { sort: busqueda.sort, page: 1 },
                      })
                    }}
                    className='text-site-meta text-site-on-surface-variant underline decoration-dotted transition-colors hover:text-site-primary'
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {isPending && (
              <p className='text-site-on-surface-variant'>Loading...</p>
            )}

            {isError && (
              <p className='text-site-on-surface-variant'>
                The list could not be loaded. Please try again in a moment.
              </p>
            )}

            {resultado !== undefined && resultado.items.length === 0 && (
              // ERS §55: el vacio se explica y se ofrece la salida.
              <div className='flex flex-col items-start gap-4 py-12'>
                <p className='font-site-display text-site-headline-sm text-site-primary'>
                  No work matches the filters you chose.
                </p>
                {filtrosActivos.length > 0 && (
                  <button
                    type='button'
                    onClick={() => {
                      void navigate({
                        search: { sort: busqueda.sort, page: 1 },
                      })
                    }}
                    className='text-site-label text-site-primary uppercase underline underline-offset-4'
                  >
                    Clear the filters
                  </button>
                )}
              </div>
            )}

            {resultado !== undefined && resultado.items.length > 0 && (
              <>
                <div className='flex flex-col gap-6'>
                  {resultado.items.map((work) => (
                    <WorkCard
                      key={work.id}
                      work={work}
                      ownerName={site?.owner.fullName ?? null}
                    />
                  ))}
                </div>

                <SitePagination
                  pagination={resultado.pagination}
                  onPage={(page) => {
                    void navigate({ search: (previa) => ({ ...previa, page }) })
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                />
              </>
            )}
          </main>
        </div>
      </section>
    </>
  )
}

function Cabecera({
  page,
  total,
}: {
  page: {
    pageTitle: string | null
    eyebrow: string | null
    introHtml: string | null
  } | null
  total: number | null
}) {
  // Sobre una foto oscurecida el texto oscuro no se lee: la cabecera entera se invierte.
  const sobreImagen = useSectionBackground('research.header') !== null

  return (
    <>
      <section
        className={cn(
          'relative w-full overflow-hidden px-site-margin pt-16 pb-24 lg:px-site-gutter lg:pt-24 lg:pb-32',
          sobreImagen ? 'text-site-on-primary' : 'bg-site-surface-container'
        )}
      >
        <SectionBackground clave='research.header' />

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
              {page?.pageTitle ?? 'Research'}
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

          {total !== null && (
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
                  Archive
                </span>
                <span
                  className={cn(
                    'text-site-label',
                    sobreImagen
                      ? 'text-site-on-primary'
                      : 'text-site-on-surface'
                  )}
                >
                  {total} {total === 1 ? 'work' : 'works'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

const ORDENES = [
  { valor: 'newest', etiqueta: 'Newest first' },
  { valor: 'oldest', etiqueta: 'Oldest first' },
  { valor: 'title', etiqueta: 'Title' },
  { valor: 'relevance', etiqueta: 'Relevance' },
] as const

function OrdenarPor({
  valor,
  onChange,
}: {
  valor: Orden
  onChange: (valor: Orden) => void
}) {
  return (
    <label className='flex items-center gap-2 text-site-meta text-site-on-surface-variant'>
      <span className='sr-only sm:not-sr-only'>Sort</span>
      <select
        aria-label='Sort results'
        value={valor}
        onChange={(evento) => {
          onChange(evento.target.value as Orden)
        }}
        className='cursor-pointer rounded-site border border-site-outline-variant bg-site-surface px-2 py-1 text-site-on-surface focus-visible:border-site-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-primary'
      >
        {ORDENES.map((orden) => (
          <option key={orden.valor} value={orden.valor}>
            {orden.etiqueta}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Los filtros puestos, con su nombre legible y como quitarlos.
 *
 * Las etiquetas salen de las facetas para que digan lo mismo que la barra lateral: un
 * codigo como `working_paper` no le dice nada a quien lee.
 */
function describirFiltros(
  busqueda: FiltrosResearch,
  facets: ResearchFacets | undefined
): Array<{
  clave: string
  etiqueta: string
  quitar: Partial<FiltrosResearch>
}> {
  const activos: Array<{
    clave: string
    etiqueta: string
    quitar: Partial<FiltrosResearch>
  }> = []

  if (busqueda.q !== undefined && busqueda.q !== '') {
    activos.push({
      clave: 'q',
      etiqueta: `"${busqueda.q}"`,
      quitar: { q: undefined },
    })
  }
  if (busqueda.type !== undefined) {
    const tipo = facets?.types.find((opcion) => opcion.code === busqueda.type)
    activos.push({
      clave: 'type',
      etiqueta: tipo?.label ?? busqueda.type,
      quitar: { type: undefined },
    })
  }
  if (busqueda.status !== undefined) {
    const estado = facets?.statuses.find(
      (opcion) => opcion.value === busqueda.status
    )
    activos.push({
      clave: 'status',
      etiqueta: estado?.label ?? busqueda.status,
      quitar: { status: undefined },
    })
  }
  if (busqueda.tag !== undefined) {
    const tag = facets?.tags.find((opcion) => opcion.slug === busqueda.tag)
    activos.push({
      clave: 'tag',
      etiqueta: tag?.name ?? busqueda.tag,
      quitar: { tag: undefined },
    })
  }
  if (busqueda.year_from !== undefined || busqueda.year_to !== undefined) {
    activos.push({
      clave: 'anio',
      etiqueta:
        busqueda.year_from !== undefined &&
        busqueda.year_from === busqueda.year_to
          ? String(busqueda.year_from)
          : busqueda.year_to !== undefined
            ? `up to ${busqueda.year_to}`
            : `from ${String(busqueda.year_from)}`,
      quitar: { year_from: undefined, year_to: undefined },
    })
  }

  return activos
}
