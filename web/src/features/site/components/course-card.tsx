import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
} from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import {
  getCourse,
  type PublicCourseOffering,
  type PublicCourseSummary,
} from '../api'
import { periodo } from '../work-format'
import { RichText } from './rich-text'
import { SiteChip } from './site-card'

/**
 * Un curso en el listado.
 *
 * Igual que en Research, la ficha —descripcion larga, ediciones, docentes y
 * materiales— **no viaja en el listado**: se pide al desplegarla (ERS §54).
 */
export function CourseCard({ course }: { course: PublicCourseSummary }) {
  const [abierto, setAbierto] = useState(false)

  const { data: ficha, isFetching } = useQuery({
    queryKey: queryKeys.public.course(course.slug),
    queryFn: () => getCourse(course.slug),
    enabled: abierto,
    staleTime: 5 * 60_000,
  })

  const activo = course.currentOffering?.isActive === true

  return (
    <article className='group relative overflow-hidden rounded-site-lg border border-site-primary/10 bg-site-surface-container-lowest p-6 shadow-sm transition-shadow hover:shadow-md md:p-8'>
      {/* Cuarto de circulo decorativo, como en la plantilla. */}
      <div
        aria-hidden
        className='absolute top-0 right-0 size-32 translate-x-16 -translate-y-16 rounded-bl-full bg-site-secondary-container opacity-20 transition-transform duration-500 group-hover:scale-110'
      />

      <div className='relative mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-start'>
        <div>
          <div className='mb-2 flex flex-wrap items-center gap-3'>
            {course.code !== null && (
              <SiteChip
                tone='solid'
                className='bg-site-primary-fixed text-site-on-primary-container'
              >
                {course.code}
              </SiteChip>
            )}
            {periodo(course.currentOffering) !== null && (
              <span className='rounded-site border border-site-outline-variant px-2 py-0.5 text-site-meta text-site-on-surface-variant'>
                {periodo(course.currentOffering)}
              </span>
            )}
          </div>

          <h3 className='font-site-display text-site-headline-sm text-site-primary'>
            <Link
              to='/teaching/$slug'
              params={{ slug: course.slug }}
              className='transition-colors hover:text-site-on-tertiary-fixed-variant'
            >
              {course.title}
            </Link>
          </h3>
        </div>

        <div className='flex flex-col items-start gap-2 md:items-end'>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-site-label uppercase',
              activo
                ? 'text-site-on-tertiary-fixed-variant'
                : 'text-site-outline'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-2 rounded-full',
                activo ? 'bg-site-tertiary' : 'bg-site-outline'
              )}
            />
            {activo ? 'Running' : 'Past'}
          </span>
        </div>
      </div>

      {course.summary !== null && (
        <p className='relative mb-6 leading-relaxed text-site-on-surface-variant'>
          {course.summary}
        </p>
      )}

      <div className='relative flex flex-wrap items-center justify-between gap-4 border-t border-site-surface-variant pt-4'>
        <div className='flex flex-wrap gap-2'>
          {course.tags.map((tag) => (
            <SiteChip key={tag.slug}>{tag.name}</SiteChip>
          ))}
        </div>

        <div className='flex flex-wrap items-center gap-4'>
          <button
            type='button'
            onClick={() => {
              setAbierto((valor) => !valor)
            }}
            aria-expanded={abierto}
            className='flex items-center gap-1.5 text-site-label tracking-wider text-site-primary uppercase transition-colors hover:text-site-on-tertiary-fixed-variant'
          >
            {isFetching ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <ChevronDown
                className={cn(
                  'size-4 transition-transform',
                  abierto && 'rotate-180'
                )}
              />
            )}
            {abierto ? 'Close' : 'See more'}
          </button>

          <Link
            to='/teaching/$slug'
            params={{ slug: course.slug }}
            className='flex items-center gap-1.5 text-site-label tracking-wider text-site-primary uppercase transition-colors hover:text-site-on-tertiary-fixed-variant'
          >
            <Folder aria-hidden className='size-4' />
            Full page
          </Link>
        </div>
      </div>

      {abierto && (
        <div className='relative mt-6 border-t border-site-surface-variant pt-6'>
          {ficha === undefined ? (
            <p className='text-site-on-surface-variant'>Loading...</p>
          ) : (
            <>
              <RichText
                html={ficha.descriptionHtml}
                className='mb-6 text-site-on-surface-variant'
              />

              {ficha.offerings.length === 0 ? (
                <p className='text-site-on-surface-variant'>
                  This course has no published offerings yet.
                </p>
              ) : (
                <ul className='flex flex-col gap-6'>
                  {ficha.offerings.map((edicion) => (
                    <li key={edicion.id}>
                      <Edicion edicion={edicion} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}

/** Una edicion desplegada: cuando, donde, quien la dio y que material dejo. */
export function Edicion({ edicion }: { edicion: PublicCourseOffering }) {
  const cabecera = [
    edicion.institution,
    edicion.department,
    edicion.term,
    edicion.academicYear,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className='border-s-2 border-site-primary/10 ps-4'>
      <p className='text-site-label tracking-widest text-site-on-surface-variant uppercase'>
        {cabecera}
      </p>

      {edicion.teachers.length > 0 && (
        <p className='mt-1 text-site-meta text-site-on-surface-variant'>
          {edicion.teachers
            .map((docente) =>
              docente.role === null
                ? docente.name
                : `${docente.name} (${docente.role})`
            )
            .join(', ')}
        </p>
      )}

      {edicion.role !== null && edicion.teachers.length === 0 && (
        <p className='mt-1 text-site-meta text-site-on-surface-variant'>
          {edicion.role}
        </p>
      )}

      {edicion.summary !== null && (
        <p className='mt-2 text-site-on-surface-variant'>{edicion.summary}</p>
      )}

      {edicion.materials.length > 0 && (
        <div className='mt-3 flex flex-wrap gap-4'>
          {edicion.materials.map((material) => (
            <a
              key={`${material.title}-${material.url ?? ''}`}
              href={material.url ?? undefined}
              className='flex items-center gap-1.5 text-site-label text-site-primary uppercase transition-colors hover:text-site-on-tertiary-fixed-variant'
            >
              {material.isExternal ? (
                <ExternalLink aria-hidden className='size-4' />
              ) : (
                <FileText aria-hidden className='size-4' />
              )}
              {material.title}
              <span className='text-site-on-surface-variant lowercase'>
                ({material.typeLabel})
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
