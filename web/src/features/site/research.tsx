import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import {
  getPageContent,
  getSite,
  listResearch,
  type PublicWorkSummary,
  type ResearchQuery,
} from './api'
import { ImagenDeCabecera } from './components/hero-image'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SitePagination } from './components/site-pagination'
import { WorkCard } from './components/work-card'
import { fondoDeCabecera } from './page-heroes'
import { useSectionBackground } from './use-section-background'
import { resumirHtml, titulo, useSiteMeta } from './use-site-meta'

/**
 * Listado publico de trabajos, agrupado por tipo.
 *
 * Se lee como un archivo, de arriba abajo: cada tipo abre su apartado y dentro van sus
 * trabajos, del mas reciente al mas antiguo. No hay filtros ni selector de orden; el
 * orden de los apartados es el que el titular da a los tipos en el panel.
 *
 * **Sigue paginando en el servidor** (PERF-001). Los trabajos llegan ya ordenados por
 * tipo, asi que agrupar es recorrerlos y abrir un apartado cada vez que cambia: si un
 * tipo se parte entre dos paginas, repite su rotulo en la siguiente.
 */

const route = getRouteApi('/_public/research/')

/**
 * La columna del contenido.
 *
 * El margen va FUERA de la caja centrada, igual que en la cabecera de la pagina. Con el
 * margen dentro, la caja se centra a su ancho maximo y el texto queda desplazado hacia la
 * derecha por el ancho del canalon: el listado entero aparecia 24px mas a la derecha que
 * el titulo de la pagina, y se notaba.
 */
function Columna({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className='px-site-margin lg:px-site-gutter'>
      <div className={cn('mx-auto max-w-site', className)}>{children}</div>
    </div>
  )
}

type Grupo = { codigo: string; titulo: string; works: PublicWorkSummary[] }

function agruparPorTipo(items: PublicWorkSummary[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const work of items) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo !== undefined && ultimo.codigo === work.type.code) {
      ultimo.works.push(work)
    } else {
      grupos.push({
        codigo: work.type.code,
        titulo: work.type.pluralLabel,
        works: [work],
      })
    }
  }
  return grupos
}

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

  // Lo unico que viaja en la direccion es la pagina: sin filtros no hay mas estado que
  // conservar al copiar el enlace.
  const consulta: ResearchQuery = { sort: 'type', page: busqueda.page }
  const {
    data: resultado,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.research(consulta),
    queryFn: () => listResearch(consulta),
    staleTime: 60_000,
  })

  useSiteMeta({
    title: titulo(page?.pageTitle ?? 'Research', site?.siteName),
    description: resumirHtml(page?.introHtml ?? null),
    path: '/research',
    imageUrl: site?.meta.ogImageUrl ?? null,
  })

  const grupos = agruparPorTipo(resultado?.items ?? [])
  const sinNada = resultado !== undefined && resultado.items.length === 0
  const hayAviso = isPending || isError || sinNada

  return (
    <>
      <Cabecera page={page ?? null} />

      {/* El margen lateral NO va en la seccion: cada rotulo es una banda de color a
          todo el ancho de la pagina, y con el margen aqui no podria llegar a los
          bordes. Lo llevan dentro los bloques que si deben alinearse con el resto. */}
      {/* Sin relleno arriba: la primera banda arranca pegada a la cabecera. Con el
          relleno de seccion aqui quedaba una franja blanca de 80px entre las dos, que
          se leia como un hueco y no como aire. Abajo si se conserva, para que el
          listado no acabe pegado al pie. */}
      <section className='w-full pb-site-section'>
        {hayAviso && (
          // El aviso si necesita aire: pegado a la cabecera se leeria como parte de
          // ella. Va aqui y no en la seccion para que no lo herede el listado.
          <Columna className='flex flex-col gap-6 pt-site-section'>
            {isPending && (
              <p className='text-site-on-surface-variant'>Loading...</p>
            )}

            {isError && (
              <p className='text-site-on-surface-variant'>
                The list could not be loaded. Please try again in a moment.
              </p>
            )}

            {sinNada && (
              // ERS §55: un listado vacio se explica, no se deja en blanco.
              <p className='font-site-display text-site-headline-sm text-site-primary'>
                No work published yet.
              </p>
            )}
          </Columna>
        )}

        {grupos.map((grupo, indice) => (
          <div
            // Un mismo tipo puede abrir dos apartados si viene partido de la pagina
            // anterior, asi que el codigo por si solo no distingue.
            key={`${grupo.codigo}-${String(indice)}`}
            className='mb-16 last:mb-0'
          >
            {/* El mismo tono que la cabecera y el pie (`primary-container`), no el
                `primary` de los titulos: son las tres bandas de cromo del sitio y
                tienen que leerse como el mismo material. */}
            <div className='w-full bg-site-primary-container py-8 lg:py-10'>
              {/* La banda llega a los bordes; el texto se queda en la misma columna que
                  las fichas, para que no baile respecto a lo que hay debajo. */}
              <Columna>
                {/* Misma letra que el titulo de la pagina —Playfair, 700— pero un
                    escalon por debajo: 48px en los dos hacia que el rotulo de la
                    seccion compitiera con el titulo de la pagina. */}
                <h2 className='font-site-display text-site-display-sm text-balance text-site-on-primary'>
                  {grupo.titulo}
                </h2>
              </Columna>
            </div>

            <Columna className='flex flex-col gap-6 pt-10'>
              {grupo.works.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  ownerName={site?.owner.fullName ?? null}
                />
              ))}
            </Columna>
          </div>
        ))}

        {resultado !== undefined && resultado.items.length > 0 && (
          <Columna className='pt-16'>
            <SitePagination
              pagination={resultado.pagination}
              onPage={(pagina) => {
                void navigate({ search: () => ({ page: pagina }) })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </Columna>
        )}
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
  const sobreImagen = useSectionBackground('research.header') !== null

  return (
    <>
      <section
        className={cn(
          'relative w-full overflow-hidden px-site-margin pt-16 pb-24 lg:px-site-gutter lg:pt-24 lg:pb-32',
          sobreImagen ? 'text-site-on-primary' : fondoDeCabecera('research')
        )}
      >
        <SectionBackground clave='research.header' />

        <div className='relative z-10 mx-auto grid max-w-site grid-cols-1 items-end gap-site-gutter md:grid-cols-12'>
          <div className='flex flex-col gap-6 md:col-span-7'>
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

          {page?.heroUrl != null && (
            <ImagenDeCabecera url={page.heroUrl} alt={page.heroAlt} />
          )}
        </div>
      </section>
    </>
  )
}
