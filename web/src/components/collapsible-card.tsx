import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

/**
 * Un bloque de formulario que empieza cerrado.
 *
 * Para lo que se rellena una vez al año: la cita a mano, el BibTeX, la posición en la
 * lista. Son campos reales y hay que poder llegar a ellos, pero pagados a precio de
 * pantalla salían caros: en Publicación ocupaban 600px de los 3.287 que había que
 * recorrer para llegar al botón de guardar.
 *
 * Cerrado, no oculto. El título dice lo que hay dentro y basta un clic; esconderlos
 * detrás de un menú o repartirlos por otras pantallas habría sido peor.
 *
 * **`forceOpen` no es un adorno.** Sin él, un campo inválido aquí dentro dejaba el
 * formulario sin guardar y sin decir por qué: se pulsaba «Save» y no pasaba nada. Lo
 * cazó una prueba que lo intentó con el bloque cerrado a propósito.
 */
export function CollapsibleCard({
  title,
  description,
  forceOpen = false,
  children,
}: {
  title: string
  description?: string
  /** Se abre solo cuando esto pasa a cierto: un error dentro que hay que leer. */
  forceOpen?: boolean
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  // Se abre en el momento en que aparece el error, no mientras dure: asi el usuario
  // puede volver a cerrarlo despues de leerlo sin que se le abra otra vez solo.
  const [habiaError, setHabiaError] = useState(forceOpen)
  if (forceOpen !== habiaError) {
    setHabiaError(forceOpen)
    if (forceOpen) setAbierto(true)
  }

  return (
    <Card>
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <CollapsibleTrigger className='group flex w-full items-center gap-2 px-6 py-4 text-start'>
          <ChevronDown className='size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180' />
          <span className='font-semibold'>{title}</span>
          {description !== undefined && (
            <span className='truncate text-sm text-muted-foreground'>
              {description}
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className='grid gap-4 pb-6'>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
