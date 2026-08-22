import { useQuery } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { ArrowLeft, Database, FileText, Link2 } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getSite, getWork, type PublicSite, type PublicWorkDetail } from './api'
import { RichText } from './components/rich-text'
import { SectionBackground } from './components/section-background'
import { SiteButton } from './components/site-button'
import { SiteChip } from './components/site-card'
import { tonoDeBanda, useSectionBackground } from './use-section-background'
import {
  metadatosDeNoDisponible,
  resumirHtml,
  useSiteMeta,
} from './use-site-meta'
import { coautores } from './work-format'

/**
 * Ficha publica de un trabajo.
 *
 * No estaba en las plantillas, pero hace falta: es lo que se comparte y lo que un
 * buscador academico indexa. ERS §53 pide aqui el resumen, todos los autores, todas
 * las etiquetas, los metadatos de publicacion, archivos, enlaces, cita y BibTeX.
 *
 * La direccion admite el identificador o el slug, como la API.
 */

const route = getRouteApi('/_public/research/$slug')

export function SiteResearchDetail() {
  const { slug } = route.useParams()

  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const {
    data: work,
    isPending,
    error,
  } = useQuery({
    queryKey: queryKeys.public.work(slug),
    queryFn: () => getWork(slug),
    staleTime: 5 * 60_000,
  })

  useSiteMeta(
    work === undefined
      ? error === null
        ? null
        : metadatosDeNoDisponible('Work not available')
      : metadatosDeTrabajo(work, site)
  )

  if (isPending) {
    return (
      <Envoltura>
        <p className='text-site-on-surface-variant'>Loading...</p>
      </Envoltura>
    )
  }

  if (error !== null) {
    const noExiste = error instanceof ApiError && error.status === 404
    return (
      <Envoltura>
        <h1 className='font-site-display text-site-headline-md text-site-primary'>
          {noExiste
            ? 'This work is not published.'
            : 'The work could not be loaded.'}
        </h1>
        <Link
          to='/research'
          className='mt-6 inline-flex items-center gap-2 text-site-label text-site-primary uppercase'
        >
          <ArrowLeft aria-hidden className='size-4' />
          Back to publications
        </Link>
      </Envoltura>
    )
  }

  return (
    <>
      <Cabecera work={work} ownerName={site?.owner.fullName ?? null} />

      <section className='w-full px-site-margin py-site-section lg:px-site-gutter'>
        <div className='mx-auto grid max-w-site grid-cols-1 gap-site-gutter lg:grid-cols-12'>
          <div className='flex flex-col gap-10 lg:col-span-8'>
            {work.abstractHtml !== null && (
              <Bloque titulo='Abstract'>
                <RichText
                  html={work.abstractHtml}
                  className='text-site-on-surface-variant'
                />
              </Bloque>
            )}

            {work.descriptionHtml !== null && (
              <Bloque titulo='Description'>
                <RichText
                  html={work.descriptionHtml}
                  className='text-site-on-surface-variant'
                />
              </Bloque>
            )}

            {work.figures.length > 0 && (
              <Bloque titulo='Figures'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  {work.figures.map((figura) => (
                    <figure key={figura.url} className='space-y-2'>
                      <img
                        src={figura.url}
                        alt={figura.label ?? ''}
                        className='w-full rounded-site border border-site-outline-variant/30'
                      />
                      {figura.label !== null && (
                        <figcaption className='text-site-meta text-site-on-surface-variant'>
                          {figura.label}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </Bloque>
            )}

            {work.citation !== null && (
              <Bloque titulo='How to cite'>
                <p className='text-site-on-surface-variant'>{work.citation}</p>
              </Bloque>
            )}

            {work.bibtex !== null && (
              <Bloque titulo='BibTeX'>
                <pre className='overflow-x-auto rounded-site border border-site-outline-variant/30 bg-site-surface-container-lowest p-4 text-site-meta text-site-on-surface-variant'>
                  {work.bibtex}
                </pre>
              </Bloque>
            )}
          </div>

          <aside className='flex flex-col gap-10 lg:col-span-4'>
            {(work.files.length > 0 || work.links.length > 0) && (
              <Bloque titulo='Downloads and links'>
                <div className='flex flex-col items-start gap-3'>
                  {work.files.map((archivo) => (
                    <a
                      key={archivo.url}
                      href={archivo.url}
                      className='flex items-center gap-2 text-site-label text-site-primary uppercase hover:text-site-on-tertiary-fixed-variant'
                    >
                      <FileText aria-hidden className='size-4' />
                      {archivo.label ?? archivo.type}
                      {archivo.version !== null && (
                        <span className='text-site-on-surface-variant'>
                          ({archivo.version})
                        </span>
                      )}
                    </a>
                  ))}
                  {work.links.map((enlace) => (
                    <a
                      key={enlace.url}
                      href={enlace.url}
                      className='flex items-center gap-2 text-site-label text-site-on-surface-variant uppercase hover:text-site-primary'
                    >
                      <Database aria-hidden className='size-4' />
                      {enlace.label ?? enlace.type}
                    </a>
                  ))}
                </div>

                {work.downloadCode !== null && (
                  <p className='mt-4 text-site-meta text-site-on-surface-variant'>
                    Download code: <strong>{work.downloadCode}</strong>
                  </p>
                )}
              </Bloque>
            )}

            <Bloque titulo='Publication details'>
              <dl className='flex flex-col gap-2 text-site-meta'>
                <Dato nombre='Type' valor={work.type.label} />
                <Dato nombre='Status' valor={work.academicStatusLabel} />
                <Dato nombre='Published in' valor={work.venue} />
                <Dato nombre='Publisher' valor={work.publisher} />
                <Dato nombre='Volume' valor={work.volume} />
                <Dato nombre='Issue' valor={work.issue} />
                <Dato nombre='Pages' valor={work.pages} />
                <Dato nombre='Article number' valor={work.articleNumber} />
                <Dato nombre='Date' valor={work.publicationDate} />
                <Dato nombre='First online' valor={work.firstOnlineDate} />
                <Dato nombre='ISSN' valor={work.issn} />
                <Dato nombre='ISBN' valor={work.isbn} />
                <Dato nombre='Version' valor={work.version} />
                <Dato nombre='Language' valor={work.language} />
              </dl>
            </Bloque>

            {work.tags.length > 0 && (
              <Bloque titulo='Topics'>
                {/* Sin filtros en el listado, un enlace por etiqueta acabaria en el
                    archivo entero: dice menos que no enlazar nada. */}
                <div className='flex flex-wrap gap-2'>
                  {work.tags.map((tag) => (
                    <SiteChip key={tag.slug}>{tag.name}</SiteChip>
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

function Envoltura({ children }: { children: React.ReactNode }) {
  return (
    <section className='mx-auto max-w-site px-site-margin py-site-section lg:px-site-gutter'>
      {children}
    </section>
  )
}

function Cabecera({
  work,
  ownerName,
}: {
  work: PublicWorkDetail
  ownerName: string | null
}) {
  // La ficha hereda el fondo de la cabecera de Research: es la misma pagina, vista de
  // cerca, y darle un mando propio multiplicaria los sitios donde elegir una foto.
  const sobreImagen = useSectionBackground('research.header') !== null
  const tono = tonoDeBanda(sobreImagen)

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden px-site-margin pt-16 pb-16 lg:px-site-gutter lg:pt-24',
        sobreImagen ? 'text-site-on-primary' : 'bg-site-surface-container'
      )}
    >
      <SectionBackground clave='research.header' />

      <div className='relative z-10 mx-auto flex max-w-site flex-col gap-6'>
        <Link
          to='/research'
          className={cn(
            'inline-flex items-center gap-2 text-site-label uppercase transition-colors',
            sobreImagen
              ? 'text-site-on-primary/70 hover:text-site-on-primary'
              : 'text-site-on-surface-variant hover:text-site-primary'
          )}
        >
          <ArrowLeft aria-hidden className='size-4' />
          Publications
        </Link>

        <div className='flex flex-wrap items-center gap-3'>
          <span
            className={cn(
              'text-site-label tracking-widest uppercase',
              tono.meta
            )}
          >
            {work.type.label}
          </span>
          {work.year !== null && (
            <span className={cn('text-site-meta', tono.meta)}>{work.year}</span>
          )}
          <span
            className={cn(
              'text-site-label tracking-widest uppercase',
              tono.acento
            )}
          >
            {work.academicStatusLabel}
          </span>
          {work.isOpenAccess && (
            <span
              className={cn(
                'text-site-label tracking-widest uppercase',
                sobreImagen
                  ? 'text-site-secondary-fixed'
                  : 'text-site-secondary'
              )}
            >
              Open access
            </span>
          )}
        </div>

        <h1
          className={cn(
            'max-w-4xl font-site-display text-site-display-sm text-balance md:text-site-display-lg',
            tono.titulo
          )}
        >
          {work.title}
        </h1>

        {work.subtitle !== null && (
          <p className={cn('max-w-3xl text-site-body-lg', tono.cuerpo)}>
            {work.subtitle}
          </p>
        )}

        <p className={tono.cuerpo}>
          {work.authors.length === 0
            ? coautores([], ownerName)
            : work.authors.map((autor) => autor.name).join(', ')}
        </p>

        {work.venue !== null && (
          <p className={cn('font-semibold', tono.titulo)}>
            {[
              work.venue,
              work.volume === null ? null : `Vol. ${work.volume}`,
              work.issue === null ? null : `(${work.issue})`,
            ]
              .filter((parte) => parte !== null)
              .join(' ')}
          </p>
        )}

        <div className='flex flex-wrap gap-4 pt-2'>
          {work.files
            .filter((archivo) => archivo.type === 'paper_pdf')
            .slice(0, 1)
            .map((archivo) => (
              <SiteButton key={archivo.url} href={archivo.url}>
                <FileText aria-hidden className='size-4' />
                Download PDF
              </SiteButton>
            ))}
          {work.doiUrl !== null && (
            <SiteButton href={work.doiUrl} variant='outline'>
              <Link2 aria-hidden className='size-4' />
              DOI
            </SiteButton>
          )}
        </div>
      </div>
    </section>
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

/** Una fila de la ficha tecnica. Lo que no tiene valor no ocupa sitio. */
function Dato({ nombre, valor }: { nombre: string; valor: string | null }) {
  if (valor === null || valor === '') return null

  return (
    <div className='flex justify-between gap-4 border-b border-site-outline-variant/20 pb-2'>
      <dt className='text-site-on-surface-variant'>{nombre}</dt>
      <dd className='text-end text-site-on-surface'>{valor}</dd>
    </div>
  )
}

/**
 * Metadatos de un trabajo, con JSON-LD `ScholarlyArticle`.
 *
 * Es lo que distingue una ficha indexable de una pagina cualquiera: el buscador
 * academico lee de aqui el DOI, los autores y la revista sin tener que adivinarlos.
 */
function metadatosDeTrabajo(
  work: PublicWorkDetail,
  site: PublicSite | undefined
) {
  return {
    title: site === undefined ? work.title : `${work.title} · ${site.siteName}`,
    description: resumirHtml(work.abstractHtml) ?? work.subtitle,
    path: `/research/${work.slug}`,
    imageUrl: work.coverUrl ?? site?.meta.ogImageUrl ?? null,
    type: 'article' as const,
    // Highwire Press: es lo que leen Google Scholar y los agregadores academicos, y no
    // entienden JSON-LD. Ver ADR-0005 sobre lo que hace falta para que las vean.
    extraMeta: [
      { name: 'citation_title', content: work.title },
      ...work.authors.map((autor) => ({
        name: 'citation_author',
        content: autor.name,
      })),
      ...(work.publicationDate === null
        ? work.year === null
          ? []
          : [{ name: 'citation_publication_date', content: String(work.year) }]
        : [
            {
              name: 'citation_publication_date',
              content: work.publicationDate,
            },
          ]),
      ...(work.venue === null
        ? []
        : [{ name: 'citation_journal_title', content: work.venue }]),
      ...(work.volume === null
        ? []
        : [{ name: 'citation_volume', content: work.volume }]),
      ...(work.issue === null
        ? []
        : [{ name: 'citation_issue', content: work.issue }]),
      ...(work.doi === null
        ? []
        : [{ name: 'citation_doi', content: work.doi }]),
      ...(work.issn === null
        ? []
        : [{ name: 'citation_issn', content: work.issn }]),
      ...(work.isbn === null
        ? []
        : [{ name: 'citation_isbn', content: work.isbn }]),
      ...(work.language === null
        ? []
        : [{ name: 'citation_language', content: work.language }]),
      ...pdfPublico(work),
    ],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      headline: work.title,
      name: work.title,
      abstract: resumirHtml(work.abstractHtml, 5000) ?? undefined,
      datePublished:
        work.publicationDate ??
        (work.year === null ? undefined : String(work.year)),
      author: work.authors.map((autor) => ({
        '@type': 'Person',
        name: autor.name,
      })),
      keywords: work.tags.map((tag) => tag.name).join(', ') || undefined,
      inLanguage: work.language ?? undefined,
      isAccessibleForFree: work.isOpenAccess,
      identifier: work.doi === null ? undefined : `https://doi.org/${work.doi}`,
      sameAs: work.doiUrl ?? undefined,
      isPartOf:
        work.venue === null
          ? undefined
          : {
              '@type': 'PublicationIssue',
              issueNumber: work.issue ?? undefined,
              isPartOf: {
                '@type': 'Periodical',
                name: work.venue,
                issn: work.issn ?? undefined,
              },
            },
      pagination: work.pages ?? undefined,
      volumeNumber: work.volume ?? undefined,
    },
  }
}

/** Scholar quiere la direccion del PDF a pelo, para poder descargarlo e indexarlo. */
function pdfPublico(
  work: PublicWorkDetail
): Array<{ name: string; content: string }> {
  const pdf = work.files.find((archivo) => archivo.type === 'paper_pdf')
  return pdf === undefined
    ? []
    : [{ name: 'citation_pdf_url', content: pdf.url }]
}
