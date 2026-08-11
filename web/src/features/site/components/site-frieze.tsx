import { cn } from '@/lib/utils'

/**
 * El friso Moche que remata el pie.
 *
 * Estuvo tambien entre la cabecera y el contenido de cada pagina, pero alli quedaba
 * como una linea suelta entre dos bandas claras y se retiro. En el borde del pie si
 * funciona: separa el contenido del bloque oscuro.
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
