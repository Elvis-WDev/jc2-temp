import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronDown, Database, FileText, Link2, Loader2 } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { getWork, type PublicWorkSummary } from '../api'
import { resumirHtml } from '../use-site-meta'
import { coautores, referencia } from '../work-format'

/**
 * Una publicacion en el listado.
 *
 * El resumen **no viaja en el listado**: se pide al desplegarlo. Asi la lista no
 * engorda con textos que casi nadie abre (PERF-002) y, a cambio, quien lo abre recibe
 * ademas los enlaces a codigo y datos, la cita y el BibTeX, que tampoco caben en un
 * resumen de listado.
 *
 * Y al desplegarlo no se vuelca el abstract entero: un parrafo academico de dos mil
 * caracteres dentro de una tarjeta empuja el resto del listado fuera de la pantalla y
 * nadie lo lee ahi. Se ensena un extracto y, al lado, el enlace a la ficha, que es donde
 * el texto completo se lee comodo.
 */
export function WorkCard({
  work,
  ownerName,
}: {
  work: PublicWorkSummary
  /** Para descontar al titular de la lista de coautores. */
  ownerName: string | null
}) {
  const [abierto, setAbierto] = useState(false)

  const { data: ficha, isFetching } = useQuery({
    queryKey: queryKeys.public.work(work.slug),
    queryFn: () => getWork(work.slug),
    // Solo cuando alguien lo pide. Cerrarlo no lo borra: volver a abrirlo es inmediato.
    enabled: abierto,
    staleTime: 5 * 60_000,
  })

  // Unas cinco lineas en la tarjeta: lo justo para saber de que va sin tener que bajar.
  const extracto = resumirHtml(ficha?.abstractHtml ?? null, 420)

  // Todos los enlaces de la ficha menos el que ya esta arriba como DOI. No se
  // excluye ningun tipo por su codigo: los tipos los crea el titular.
  const enlacesExtra = (ficha?.links ?? []).filter(
    (enlace) => enlace.url !== work.doiUrl
  )

  return (
    <article className='group relative overflow-hidden border border-site-primary-container/10 bg-site-surface-bright p-6 transition-shadow hover:shadow-sm'>
      {/* Filete que se despliega de arriba abajo al pasar por encima. */}
      <div
        aria-hidden
        className='absolute top-0 bottom-0 left-0 w-1 origin-top scale-y-0 bg-site-primary-container transition-transform duration-300 ease-out group-hover:scale-y-100'
      />

      {/* El tipo no se repite en la ficha: el listado va agrupado y la banda de encima
          ya lo dice. Decirlo otra vez en cada tarjeta es ruido entre el lector y el
          titulo, que es lo que viene a leer. */}
      <div className='flex flex-wrap items-center gap-3'>
        {work.year !== null && (
          <>
            <span className='text-site-meta text-site-on-surface-variant'>
              {work.year}
            </span>
            <Punto />
          </>
        )}
        <span className='text-site-label tracking-widest text-site-on-tertiary-fixed-variant uppercase'>
          {work.academicStatusLabel}
        </span>
        {work.isOpenAccess && (
          <span className='text-site-label tracking-widest text-site-secondary uppercase'>
            Acceso abierto
          </span>
        )}
      </div>

      <h2 className='mt-2 font-site-display text-site-headline-sm text-site-on-surface'>
        <Link
          to='/research/$slug'
          params={{ slug: work.slug }}
          className='transition-colors hover:text-site-primary'
        >
          {work.title}
        </Link>
      </h2>

      {work.subtitle !== null && (
        <p className='mt-1 text-site-on-surface-variant'>{work.subtitle}</p>
      )}

      <p className='mt-1 text-site-on-surface-variant italic'>
        {coautores(work.authors, ownerName)}
      </p>

      {referencia(work) !== null && (
        <p className='mt-1 font-semibold text-site-on-surface'>
          {referencia(work)}
        </p>
      )}

      <div className='mt-4 flex flex-wrap items-center gap-4 border-t border-site-outline-variant/50 pt-4'>
        {work.pdfUrl !== null && (
          <Accion
            href={work.pdfUrl}
            icono={<FileText className='size-4' />}
            destacada
          >
            PDF
          </Accion>
        )}
        {work.doiUrl !== null && (
          <Accion href={work.doiUrl} icono={<Link2 className='size-4' />}>
            DOI
          </Accion>
        )}

        <button
          type='button'
          onClick={() => {
            setAbierto((valor) => !valor)
          }}
          aria-expanded={abierto}
          className='flex items-center gap-1.5 text-site-label text-site-on-surface-variant uppercase transition-colors hover:text-site-primary'
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
          Abstract
        </button>

        {abierto &&
          enlacesExtra.map((enlace) => (
            <Accion
              key={enlace.url}
              href={enlace.url}
              icono={<Database className='size-4' />}
            >
              {enlace.label ?? enlace.type}
            </Accion>
          ))}

        {abierto && (
          <Link
            to='/research/$slug'
            params={{ slug: work.slug }}
            className='ms-auto text-site-label text-site-primary uppercase hover:text-site-on-tertiary-fixed-variant'
          >
            Full page
          </Link>
        )}
      </div>

      {abierto && (
        <div className='mt-3 w-full border border-site-outline-variant/30 bg-site-surface-container-lowest p-4 text-site-on-surface-variant'>
          {ficha === undefined ? (
            <p>Loading the abstract...</p>
          ) : extracto === null ? (
            // ERS §55: mejor decir que no hay que dejar un panel vacio.
            <p>This work has no published abstract.</p>
          ) : (
            <p className='leading-relaxed'>{extracto}</p>
          )}
        </div>
      )}
    </article>
  )
}

function Punto() {
  return (
    <span aria-hidden className='size-1 rounded-full bg-site-outline-variant' />
  )
}

function Accion({
  href,
  icono,
  destacada = false,
  children,
}: {
  href: string
  icono: React.ReactNode
  destacada?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-1.5 text-site-label uppercase transition-colors',
        destacada
          ? 'text-site-primary hover:text-site-on-tertiary-fixed-variant'
          : 'text-site-on-surface-variant hover:text-site-primary'
      )}
    >
      {icono}
      {children}
    </a>
  )
}
