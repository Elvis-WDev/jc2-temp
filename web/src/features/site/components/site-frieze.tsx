import { cn } from '@/lib/utils'

/**
 * El friso Moche que separa secciones y remata el pie.
 *
 * Dos versiones porque el motivo esta dibujado en un color, no en `currentColor`: la
 * oscura para fondos claros y la clara para el pie, que es azul noche.
 *
 * `aria-hidden` porque no dice nada: es ornamento. Un lector de pantalla que lo
 * anunciara solo estaria interrumpiendo.
 */
export function SiteFrieze({
  tone = 'dark',
  className,
}: {
  /** `dark`: motivo azul sobre fondo claro. `light`: motivo blanco sobre fondo azul. */
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        tone === 'light' ? 'site-frieze-light' : 'site-frieze',
        className
      )}
    />
  )
}

/** Separador entre bloques de una misma pagina, a lo ancho del contenido. */
export function SiteDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'mx-auto max-w-site px-site-margin lg:px-site-gutter',
        className
      )}
    >
      <SiteFrieze />
    </div>
  )
}
