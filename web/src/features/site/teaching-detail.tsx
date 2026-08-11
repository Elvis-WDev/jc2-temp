import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import {
  getCourse,
  getSite,
  type PublicCourseDetail,
  type PublicSite,
} from './api'
import { Edicion } from './components/course-card'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SiteButton } from './components/site-button'
import { SiteChip } from './components/site-card'
import { tonoDeBanda, useSectionBackground } from './use-section-background'
import { resumirHtml, useSiteMeta } from './use-site-meta'

/**
 * Ficha publica de un curso.
 *
 * ERS §54: al abrir un curso se ven la descripcion, todas sus ediciones con sus
 * fechas, codigos y papel, y sus materiales publicos.
 */

const route = getRouteApi('/_public/teaching/$slug')

export function SiteTeachingDetail() {
  // La ficha hereda el fondo de la cabecera de su listado: es la misma pagina, vista
  // de cerca, y darle un mando propio multiplicaria los sitios donde elegir una foto.
  const sobreImagen = useSectionBackground('teaching.header') !== null
  const tono = tonoDeBanda(sobreImagen)

  const { slug } = route.useParams()

  const {
    data: curso,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.public.course(slug),
    queryFn: () => getCourse(slug),
    staleTime: 5 * 60_000,
  })

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  useSiteMeta(curso === undefined ? null : metadatosDeCurso(curso, site))

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
            ? 'This course is not published.'
            : 'The course could not be loaded.'}
        </h1>
        <Link
          to='/teaching'
          className='mt-6 inline-flex items-center gap-2 text-site-label text-site-primary uppercase'
        >
          <ArrowLeft aria-hidden className='size-4' />
          Back to teaching
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
        <SectionBackground clave='teaching.header' />

        <div className='relative z-10 mx-auto flex max-w-site flex-col gap-6'>
          <Link
            to='/teaching'
            className={cn(
              'inline-flex items-center gap-2 text-site-label uppercase transition-colors',
              sobreImagen
                ? 'text-site-on-primary/70 hover:text-site-on-primary'
                : 'text-site-on-surface-variant hover:text-site-primary'
            )}
          >
            <ArrowLeft aria-hidden className='size-4' />
            Teaching
          </Link>

          <div className='flex flex-wrap items-center gap-3'>
            {curso.code !== null && (
              <SiteChip tone='accent'>{curso.code}</SiteChip>
            )}
            {curso.level !== null && (
              <span
                className={cn(
                  'text-site-label tracking-widest uppercase',
                  tono.meta
                )}
              >
                {curso.level}
              </span>
            )}
          </div>

          <h1 className='max-w-4xl font-site-display text-site-display-sm text-balance text-site-on-surface md:text-site-display-lg'>
            {curso.title}
          </h1>

          {curso.summary !== null && (
            <p className='max-w-3xl text-site-body-lg text-site-on-surface-variant'>
              {curso.summary}
            </p>
          )}

          {curso.externalUrl !== null && (
            <div className='pt-2'>
              <SiteButton href={curso.externalUrl} variant='outline'>
                <ExternalLink aria-hidden className='size-4' />
                Official page
              </SiteButton>
            </div>
          )}
        </div>
      </section>

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto grid max-w-site grid-cols-1 gap-site-gutter lg:grid-cols-12'>
          <div className='flex flex-col gap-10 lg:col-span-8'>
            {curso.descriptionHtml !== null && (
              <Bloque titulo='Description'>
                <RichText
                  html={curso.descriptionHtml}
                  className='text-site-on-surface-variant'
                />
              </Bloque>
            )}

            <Bloque titulo={`Offerings (${String(curso.offerings.length)})`}>
              {curso.offerings.length === 0 ? (
                <p className='text-site-on-surface-variant'>
                  This course has no published offerings yet.
                </p>
              ) : (
                <ul className='flex flex-col gap-8'>
                  {curso.offerings.map((edicion) => (
                    <li key={edicion.id}>
                      <Edicion edicion={edicion} />
                      <RichText
                        html={edicion.contentHtml}
                        className='mt-3 ps-4 text-site-on-surface-variant'
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>
          </div>

          <aside className='flex flex-col gap-10 lg:col-span-4'>
            {curso.tags.length > 0 && (
              <Bloque titulo='Topics'>
                <div className='flex flex-wrap gap-2'>
                  {curso.tags.map((tag) => (
                    <Link
                      key={tag.slug}
                      to='/teaching'
                      search={{ tag: tag.slug }}
                    >
                      <SiteChip>{tag.name}</SiteChip>
                    </Link>
                  ))}
                </div>
              </Bloque>
            )}
          </aside>
        </div>
      </section>
    </>
  )
}

function Bloque({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className='mb-4 border-b border-site-outline-variant/30 pb-2 text-site-label tracking-widest text-site-on-surface uppercase'>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Metadatos de un curso, con JSON-LD `Course`. */
function metadatosDeCurso(
  curso: PublicCourseDetail,
  site: PublicSite | undefined
) {
  const impartido = curso.offerings[0]

  return {
    title:
      site === undefined ? curso.title : `${curso.title} · ${site.siteName}`,
    description: curso.summary ?? resumirHtml(curso.descriptionHtml),
    path: `/teaching/${curso.slug}`,
    imageUrl: curso.coverUrl ?? site?.meta.ogImageUrl ?? null,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: curso.title,
      courseCode: curso.code ?? undefined,
      description:
        curso.summary ?? resumirHtml(curso.descriptionHtml, 5000) ?? undefined,
      url: curso.externalUrl ?? undefined,
      keywords: curso.tags.map((tag) => tag.name).join(', ') || undefined,
      provider:
        impartido === undefined
          ? undefined
          : { '@type': 'Organization', name: impartido.institution },
      hasCourseInstance: curso.offerings.map((edicion) => ({
        '@type': 'CourseInstance',
        courseMode: 'onsite',
        startDate: edicion.startDate ?? undefined,
        endDate: edicion.endDate ?? undefined,
        location: edicion.institution,
        instructor: edicion.teachers.map((docente) => ({
          '@type': 'Person',
          name: docente.name,
        })),
      })),
    },
  }
}
