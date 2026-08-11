import { FileQuestion, FilterX, Lock, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Estado vacio con causa explicita (ERS §55, `feedback-and-states.md:76-86`).
 *
 * El ERS insiste en no mostrar una seccion vacia sin explicacion, y en distinguir
 * cuatro situaciones que se parecen en pantalla pero piden acciones distintas:
 *
 *  - `empty`        no hay nada creado todavia  -> ofrecer crear
 *  - `no-results`   los filtros no encuentran   -> ofrecer limpiar filtros
 *  - `no-permission` falta permiso              -> no ofrecer nada
 *  - `prerequisite` falta configurar algo antes -> llevar a esa configuracion
 *
 * Mostrar "No hay resultados" cuando en realidad no se ha creado nada hace que el
 * usuario busque un filtro que no existe.
 */

export type EmptyStateVariant =
  | 'empty'
  | 'no-results'
  | 'no-permission'
  | 'prerequisite'

const ICONOS: Record<EmptyStateVariant, React.ElementType> = {
  empty: FileQuestion,
  'no-results': FilterX,
  'no-permission': Lock,
  prerequisite: Settings2,
}

type EmptyStateProps = {
  variant?: EmptyStateVariant
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({
  variant = 'empty',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icono = ICONOS[variant]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 py-8 text-center',
        className
      )}
    >
      <Icono className='size-8 text-muted-foreground' aria-hidden />
      <p className='font-medium'>{title}</p>
      {description !== undefined && (
        <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      )}
      {/* Sin permiso no se ofrece accion: un boton que no se puede usar es peor que
          ninguno. */}
      {action !== undefined && variant !== 'no-permission' && (
        <Button
          variant='outline'
          size='sm'
          className='mt-2'
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
