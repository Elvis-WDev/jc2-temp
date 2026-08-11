import { cn } from '@/lib/utils'

/**
 * Etiqueta de estado con color.
 *
 * El mismo estado se ve igual en todas las pantallas, para poder leer una tabla de un
 * vistazo sin detenerse en el texto.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONOS: Record<StatusTone, string> = {
  success:
    'bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:text-emerald-300',
  warning:
    'bg-amber-500/12 text-amber-700 border-amber-500/30 dark:text-amber-300',
  danger: 'bg-red-500/12 text-red-700 border-red-500/30 dark:text-red-300',
  info: 'bg-sky-500/12 text-sky-700 border-sky-500/30 dark:text-sky-300',
  neutral: 'bg-muted text-muted-foreground border-border',
}

type Props = {
  tone: StatusTone
  children: React.ReactNode
  /** Punto de color: ayuda a distinguir sin depender solo del color del texto. */
  dot?: boolean
  className?: string
}

const PUNTOS: Record<StatusTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-muted-foreground/50',
}

export function StatusBadge({ tone, children, dot = true, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONOS[tone],
        className
      )}
    >
      {/* El punto acompana al color: nunca se comunica un estado solo con color. */}
      {dot && (
        <span
          className={cn('size-1.5 shrink-0 rounded-full', PUNTOS[tone])}
          aria-hidden
        />
      )}
      {children}
    </span>
  )
}
