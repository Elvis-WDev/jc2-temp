import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getPageContent, getSite, listPosts } from './api'
import { PostCard } from './components/post-card'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SitePagination } from './components/site-pagination'
import { fondoDeCabecera } from './page-heroes'
import { type PaginaDeEntradas } from './post-pages'
import { useSectionBackground } from './use-section-background'
import { resumirHtml, titulo, useSiteMeta } from './use-site-meta'

/**
 * Noticias y blog: el mismo listado, con distinto filtro.
 *
 * Sin barra de filtros, como se decidio en Research: quien entra aqui quiere leer lo
 * ultimo, no acotar una busqueda. El orden lo pone el servidor —lo fijado primero y
 * luego por fecha— y aqui no se reordena nada.
 *
 * La cabecera sale de `page_content`, asi que el titulo, la entradilla y la imagen de
 * fondo se cambian desde el panel sin tocar esto.
 */
export function SitePosts({ pagina }: { pagina: PaginaDeEntradas }) {
  // Sin `strict`: el mismo componente sirve a dos rutas distintas.
  const busqueda = useSearch({ strict: false }) as { page?: number }
  const navigate = useNavigate()

  const consulta = { kind: pagina.kind, page: busqueda.page ?? 1 }

  const {
    data: resultado,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.public.posts(consulta),
    queryFn: () => listPosts(consulta),
    staleTime: 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const { data: page } = useQuery({
    queryKey: queryKeys.public.page(pagina.pageKey),
    queryFn: () => getPageContent(pagina.pageKey),
    staleTime: 5 * 60_000,
  })

  useSiteMeta({
    title: titulo(page?.pageTitle ?? pagina.titulo, site?.siteName),
    description: resumirHtml(page?.introHtml ?? null) ?? pagina.entradilla,
    path: pagina.ruta,
    imageUrl: site?.meta.ogImageUrl ?? null,
  })

  const clave = `${pagina.pageKey}.header`
  // Sobre una foto oscurecida el texto oscuro no se lee: la cabecera se invierte.
  const sobreImagen = useSectionBackground(clave) !== null

  return (
    <>
      <section
        className={cn(
          'relative w-full overflow-hidden px-site-margin pt-16 pb-24 lg:px-site-gutter lg:pt-24 lg:pb-32',
          sobreImagen ? 'text-site-on-primary' : fondoDeCabecera(pagina.pageKey)
        )}
      >
        <SectionBackground clave={clave} />

        <div className='relative z-10 mx-auto flex max-w-site flex-col gap-6'>
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
            {page?.pageTitle ?? pagina.titulo}
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
              {pagina.entradilla}
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
      </section>

      <section className='w-full px-site-margin pb-site-section lg:px-site-gutter'>
        <div className='mx-auto flex max-w-site flex-col gap-8 pt-site-section'>
          {isPending && (
            <p className='text-site-on-surface-variant'>Loading...</p>
          )}

          {isError && (
            <p className='text-site-on-surface-variant'>
              This could not be loaded. Please try again in a moment.
            </p>
          )}

          {resultado !== undefined && resultado.items.length === 0 && (
            <p className='py-12 font-site-display text-site-headline-sm text-site-primary'>
              {pagina.vacio}
            </p>
          )}

          {resultado !== undefined && resultado.items.length > 0 && (
            <>
              <div
                className={
                  pagina.listadoEnRejilla
                    ? 'grid gap-6 md:grid-cols-2'
                    : 'flex flex-col gap-6'
                }
              >
                {resultado.items.map((entrada) => (
                  <PostCard
                    key={entrada.id}
                    post={entrada}
                    pagina={pagina}
                    variante={pagina.listadoEnRejilla ? 'rejilla' : 'ancha'}
                  />
                ))}
              </div>

              <SitePagination
                pagination={resultado.pagination}
                onPage={(numero) => {
                  void navigate({
                    to: pagina.ruta,
                    search: { page: numero },
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
