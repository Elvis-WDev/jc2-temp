import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Botón de ocultar y volver a mostrar, en un solo control.
 *
 * Antes, ocultar algo lo dejaba fuera del panel para siempre: el botón se deshabilitaba
 * y no había acción contraria. Aquí el mismo sitio hace las dos cosas, así que ocultar
 * deja de ser una decisión definitiva.
 *
 * Ocultar pasa por una confirmación —de ahí que `onHide` abra un diálogo en lugar de
 * ejecutar—; volver a mostrar no la necesita, porque no retira nada de ningún sitio.
 */

type Props = {
  isActive: boolean
  /** Sobre qué actúa. Solo lo lee el lector de pantalla; en la tabla ya se ve. */
  name: string
  onHide: () => void
  onShow: () => void
  /** El género cambia por módulo: "Ocultar la institución", "Ocultar el tipo". */
  hideLabel?: string
  showLabel?: string
  isLoading?: boolean
}

export function VisibilityToggleButton({
  isActive,
  name,
  onHide,
  onShow,
  hideLabel = 'Ocultar',
  showLabel = 'Mostrar',
  isLoading = false,
}: Props) {
  const etiqueta = isActive ? hideLabel : showLabel

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          disabled={isLoading}
          aria-label={`${etiqueta}: ${name}`}
          onClick={isActive ? onHide : onShow}
        >
          {isActive ? (
            <EyeOff className='size-4' />
          ) : (
            <Eye className='size-4' />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  )
}
