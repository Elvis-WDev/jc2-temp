import { Link } from '@tanstack/react-router'
import { FileText, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PublicWorkSummary } from '../api'
import { coautores, referencia } from '../work-format'

/**
 * Una publicacion en el listado.
 *
 * El extracto del abstract se ensena fijo, sin nada que pulsar. Antes estaba detras de
 * un boton y cada tarjeta pedia su ficha al desplegarse; a la vista siempre, eso serian
 * tantas peticiones como publicaciones haya en la pagina, asi que el extracto viaja ya
 * recortado en el propio listado.
 *
 * Es un extracto y no el abstract entero: un parrafo academico de dos mil caracteres
 * dentro de una tarjeta empuja el resto del listado fuera de la pantalla y nadie lo lee
 * ahi. Al lado va el enlace a la ficha, que es donde el texto completo se lee comodo, y
 * donde estan la cita, el BibTeX y los enlaces a codigo y datos.
 */
export function WorkCard({
  work,
  ownerName,
}: {
  work: PublicWorkSummary
  /** Para descontar al titular de la lista de coautores. */
  ownerName: string | null
}) {
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

        <Link
          to='/research/$slug'
          params={{ slug: work.slug }}
          className='ms-auto text-site-label text-site-primary uppercase hover:text-site-on-tertiary-fixed-variant'
        >
          Full page
        </Link>
      </div>

      {work.abstractExcerpt !== null && (
        // Sin recuadro: la tarjeta ya es una caja, y encerrar el texto en otra dentro
        // solo anade un borde que no separa nada. Sin abstract publicado no se pinta
        // nada, en lugar de un panel diciendo que no lo hay.
        <p className='mt-4 leading-relaxed text-site-on-surface-variant'>
          {work.abstractExcerpt}
        </p>
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
