import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/**
 * Botones del sitio publico.
 *
 * No se reutiliza el `Button` del panel: lleva otro radio, otra tipografia y cambia
 * con el tema oscuro, que aqui no existe.
 *
 * Solo enlaces, no `<button>`: en el sitio publico todo lo que se pulsa lleva a algun
 * sitio o descarga algo. Cuando haga falta un boton de verdad —desplegar un resumen—
 * sera otro componente, porque tiene otro aspecto en la plantilla.
 */

type Variante = 'solid' | 'outline'

const VARIANTES: Record<Variante, string> = {
  solid: 'bg-site-primary text-site-on-primary hover:bg-site-primary/90',
  outline:
    'border border-site-primary text-site-primary bg-transparent hover:bg-site-primary/5',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-site px-6 py-3 font-site-body text-site-meta tracking-wider uppercase transition-colors duration-200'

type Props = React.ComponentProps<'a'> & { variant?: Variante }

export function SiteButton({ variant = 'solid', className, ...props }: Props) {
  return <a className={cn(BASE, VARIANTES[variant], className)} {...props} />
}

/**
 * El mismo boton, pero hacia otra pagina del sitio.
 *
 * Un `<a>` normal recargaria la aplicacion entera para ir de la portada a Research, y
 * con ella la cabecera, los estilos y las peticiones que ya estaban resueltas.
 */
type PropsEnlace = React.ComponentProps<typeof Link> & { variant?: Variante }

export function SiteButtonLink({
  variant = 'solid',
  className,
  ...props
}: PropsEnlace) {
  return <Link className={cn(BASE, VARIANTES[variant], className)} {...props} />
}
