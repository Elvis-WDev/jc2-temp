import { cn } from '@/lib/utils'

/**
 * Tarjeta del sitio: un trabajo, un curso, un evento.
 *
 * El movimiento al pasar por encima viene de la plantilla, y es el mismo en las tres
 * paginas: se levanta un punto y gana una sombra muy suave. Nada de escalados ni de
 * cambios de color de fondo, que en una lista larga marean.
 */
export function SiteCard({
  children,
  className,
  ...props
}: React.ComponentProps<'article'>) {
  return (
    <article
      className={cn(
        'group border border-site-outline-variant/30 bg-site-surface-container-lowest p-6',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className
      )}
      {...props}
    >
      {children}
    </article>
  )
}

/** Etiqueta pequena: un tema, un tipo, un periodo. */
export function SiteChip({
  children,
  tone = 'muted',
  className,
}: {
  children: React.ReactNode
  tone?: 'muted' | 'accent' | 'solid'
  className?: string
}) {
  const tonos = {
    muted: 'bg-site-surface-container text-site-secondary',
    accent: 'bg-site-primary/5 text-site-primary/60',
    solid: 'bg-site-primary-container text-site-on-primary',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-site px-2 py-1 text-site-label uppercase',
        tonos[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
