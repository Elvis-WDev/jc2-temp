import { cn } from '@/lib/utils'
import { useSectionBackground } from '../use-section-background'
import { SectionBackground } from './section-background'

/**
 * Las dos piezas que estructuran cualquier pagina del sitio.
 *
 * `SiteSection` pone el ancho maximo (1120px), el margen lateral y el aire vertical.
 * `SectionHeading` es el encabezado con la linea inferior que aparece en las tres
 * plantillas: titulo a la izquierda, dato o enlace a la derecha.
 */

type SeccionProps = {
  children: React.ReactNode
  className?: string
  /**
   * Fondo propio. Por defecto hereda el de la pagina.
   *
   * `brand` es el solido del encabezado y el pie, el mismo que separa los tipos de
   * publicacion en Research. Con el, el texto de la banda se invierte: sobre ese fondo
   * el oscuro no se lee.
   */
  tone?: 'default' | 'raised' | 'sunken' | 'brand' | 'blank'
  id?: string
  /**
   * Clave de la seccion en `page_sections` (`home.featured_works`).
   *
   * Con ella la banda pinta la imagen que el titular haya elegido en el panel. Sin
   * imagen elegida no cambia nada: se queda con el color de su `tone`.
   */
  backgroundKey?: string
}

const FONDOS: Record<NonNullable<SeccionProps['tone']>, string> = {
  default: '',
  raised: 'bg-site-surface-container-lowest',
  sunken: 'bg-site-surface-container-low',
  brand: 'bg-site-primary-container text-site-on-primary',
  // Blanco de verdad, no el hueso del fondo de la pagina.
  blank: 'bg-site-surface-container-lowest',
}

export function SiteSection({
  children,
  className,
  tone = 'default',
  id,
  backgroundKey,
}: SeccionProps) {
  const conImagen =
    useSectionBackground(backgroundKey ?? '') !== null &&
    backgroundKey !== undefined

  return (
    <section
      id={id}
      className={cn(
        'py-site-section',
        // Con imagen no se pinta el color del `tone`: lo taparia.
        conImagen
          ? 'relative overflow-hidden text-site-on-primary'
          : FONDOS[tone],
        className
      )}
    >
      {backgroundKey !== undefined && (
        <SectionBackground clave={backgroundKey} />
      )}
      <div className='relative z-10 mx-auto max-w-site px-site-margin lg:px-site-gutter'>
        {children}
      </div>
    </section>
  )
}

export function SectionHeading({
  title,
  aside,
  dark = false,
}: {
  title: string
  /** Lo de la derecha: un recuento, una fecha o un enlace a la lista completa. */
  aside?: React.ReactNode
  dark?: boolean
}) {
  return (
    <div
      className={cn(
        'mb-12 flex flex-col items-baseline justify-between border-b pb-4 md:flex-row',
        dark ? 'border-site-on-primary/10' : 'border-site-outline-variant/20'
      )}
    >
      <h2
        className={cn(
          'font-site-display text-site-headline-md',
          dark ? 'text-site-on-primary' : 'text-site-primary'
        )}
      >
        {title}
      </h2>
      {aside !== undefined && (
        <div
          className={cn(
            'mt-4 text-site-meta tracking-widest uppercase md:mt-0',
            dark ? 'text-site-on-primary/60' : 'text-site-on-surface-variant'
          )}
        >
          {aside}
        </div>
      )}
    </div>
  )
}
