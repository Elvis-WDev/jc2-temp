import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Download } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getPost, getSite, type PublicPost, type PublicSite } from './api'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { fechaLarga } from './post-format'
import { type PaginaDeEntradas } from './post-pages'
import { useSectionBackground } from './use-section-background'
import {
  metadatosDeNoDisponible,
  resumirHtml,
  useSiteMeta,
} from './use-site-meta'

/**
 * La ficha de una entrada, igual para noticias y para blog.
 *
 * Lo que cambia es lo que hay dentro: una noticia se queda en el resumen y una entrada
 * de blog trae ademas el cuerpo y sus adjuntos. Nada de eso se decide aqui —se pinta lo
 * que llega—, asi que una noticia larga se veria bien sin tocar nada.
 *
 * Se abre aunque su indice este oculto: un enlace que ya circula no puede romperse
 * porque este mes se decida no ensenar la seccion (RN-010).
 */
export function SitePostDetail({ pagina }: { pagina: PaginaDeEntradas }) {
  // La ficha hereda el fondo de la cabecera de su listado: es la misma pagina, vista de
  // cerca, y darle un mando propio multiplicaria los sitios donde elegir una foto.
  const clave = `${pagina.pageKey}.header`
  const sobreImagen = useSectionBackground(clave) !== null

  // Sin `strict`: el mismo componente sirve a dos rutas distintas.
  const { slug } = useParams({ strict: false }) as { slug: string }

  const {
    data: entrada,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.public.post(slug),
    queryFn: () => getPost(slug),
    staleTime: 5 * 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  useSiteMeta(
    entrada === undefined
      ? error === null
        ? null
        : metadatosDeNoDisponible('Not available')
      : metadatosDeEntrada(entrada, pagina, site)
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
            ? 'This entry is not published.'
            : 'This entry could not be loaded.'}
        </h1>
        <Link
          to={pagina.listado ?? '/'}
          className='mt-6 inline-flex items-center gap-2 text-site-label text-site-primary uppercase'
        >
          <ArrowLeft aria-hidden className='size-4' />
          Back to {pagina.listado === null ? 'the home page' : pagina.titulo}
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
        <SectionBackground clave={clave} />

        <div className='relative z-10 mx-auto flex max-w-site flex-col gap-6'>
          <Link
            to={pagina.listado ?? '/'}
            className={cn(
              'inline-flex items-center gap-2 text-site-label uppercase transition-colors',
              sobreImagen
                ? 'text-site-on-primary/70 hover:text-site-on-primary'
                : 'text-site-on-surface-variant hover:text-site-primary'
            )}
          >
            <ArrowLeft aria-hidden className='size-4' />
            {pagina.listado === null ? 'Home' : pagina.titulo}
          </Link>

          <h1 className='max-w-4xl font-site-display text-site-display-sm text-balance text-site-on-surface md:text-site-display-lg'>
            {entrada.title}
          </h1>

          {entrada.publishedAt !== null && (
            <p
              className={cn(
                'flex items-center gap-2',
                sobreImagen
                  ? 'text-site-on-primary/85'
                  : 'text-site-on-surface-variant'
              )}
            >
              <CalendarDays aria-hidden className='size-4' />
              {fechaLarga(entrada.publishedAt)}
            </p>
          )}
        </div>
      </section>

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto max-w-3xl'>
          {entrada.imageUrl !== null && (
            <img
              src={entrada.imageUrl}
              alt={entrada.imageAlt ?? ''}
              className='mb-8 w-full rounded-site border border-site-outline-variant/30'
            />
          )}

          {entrada.summary !== null && (
            <p className='mb-6 text-site-body-lg text-site-on-surface-variant'>
              {entrada.summary}
            </p>
          )}

          {entrada.contentHtml !== null && (
            <RichText
              html={entrada.contentHtml}
              className='text-site-on-surface-variant'
            />
          )}

          {entrada.contentHtml === null && entrada.summary === null && (
            <p className='text-site-on-surface-variant'>
              This entry has no further published details yet.
            </p>
          )}

          {entrada.files.length > 0 && (
            <div className='mt-12 border-t border-site-outline-variant/40 pt-6'>
              <h2 className='text-site-label tracking-widest text-site-on-surface-variant uppercase'>
                Attachments
              </h2>
              <ul className='mt-4 flex flex-col gap-4'>
                {entrada.files.map((archivo) => (
                  <li key={archivo.url}>
                    {archivo.mimeType.startsWith('audio/') ? (
                      // Se escucha aqui mismo: bajar un archivo para oir treinta
                      // segundos es pedir demasiado. `preload="none"` porque la entrega
                      // no admite peticiones por rango y el navegador se lo traeria
                      // entero solo por estar la pagina abierta.
                      <figure className='flex flex-col gap-2'>
                        <figcaption className='text-site-meta text-site-on-surface-variant'>
                          {archivo.label ?? 'Recording'}
                        </figcaption>
                        <audio
                          controls
                          preload='none'
                          src={archivo.url}
                          className='w-full'
                        >
                          <a href={archivo.url}>Download the recording</a>
                        </audio>
                      </figure>
                    ) : (
                      <a
                        href={archivo.url}
                        className='inline-flex items-center gap-2 text-site-primary underline-offset-4 hover:underline'
                      >
                        <Download aria-hidden className='size-4' />
                        {archivo.label ?? 'Download'}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/** Metadatos de una entrada, con JSON-LD `BlogPosting`. */
function metadatosDeEntrada(
  entrada: PublicPost,
  pagina: PaginaDeEntradas,
  site: PublicSite | undefined
) {
  return {
    title:
      site === undefined
        ? entrada.title
        : `${entrada.title} · ${site.siteName}`,
    description: entrada.summary ?? resumirHtml(entrada.contentHtml),
    path: `${pagina.base}/${entrada.slug}`,
    imageUrl: entrada.imageUrl ?? site?.meta.ogImageUrl ?? null,
    jsonLd: {
      '@context': 'https://schema.org',
      // `NewsArticle` y `BlogPosting` son los dos tipos que Schema.org distingue aqui,
      // y cual es cual lo decide la pagina, no el contenido.
      '@type': pagina.conCuerpo ? 'BlogPosting' : 'NewsArticle',
      headline: entrada.title,
      description:
        entrada.summary ?? resumirHtml(entrada.contentHtml, 5000) ?? undefined,
      datePublished: entrada.publishedAt ?? undefined,
      image: entrada.imageUrl ?? undefined,
      author:
        site === undefined
          ? undefined
          : { '@type': 'Person', name: site.owner.fullName },
    },
  }
}
