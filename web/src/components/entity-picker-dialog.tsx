import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Selección de una entidad relacionada mediante búsqueda
 * (`forms-and-workflows.md:32-45`).
 *
 * Existe para que **nadie tenga que escribir un UUID**. El formulario envía un
 * identificador, pero la persona ve y busca por el nombre del trabajo, del autor o de
 * la institución.
 *
 * Es genérico a propósito: no sabe qué entidad selecciona. Quien lo usa aporta la
 * consulta y cómo se pinta cada fila, así que sirve igual para autores, instituciones
 * o etiquetas sin duplicarlo por módulo.
 */

export type EntityPickerProps<T> = {
  open: boolean
  onOpenChange: (open: boolean) => void

  title: string
  description?: string
  searchPlaceholder?: string

  /** Clave base de React Query; se le añade el término de búsqueda. */
  queryKey: readonly unknown[]
  /** Búsqueda en el servidor: recibe el término ya debounced. */
  queryFn: (search: string) => Promise<T[]>

  getId: (item: T) => string
  renderItem: (item: T) => React.ReactNode

  /** Identificadores ya elegidos: se marcan y no se pueden volver a añadir. */
  selectedIds?: string[]
  onSelect: (item: T) => void

  emptyMessage?: string
}

export function EntityPickerDialog<T>({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = 'Search...',
  queryKey,
  queryFn,
  getId,
  renderItem,
  selectedIds = [],
  onSelect,
  emptyMessage = 'No matches.',
}: EntityPickerProps<T>) {
  const [termino, setTermino] = useState('')
  // Se espera a que deje de teclear: sin esto, cada pulsación sería una petición.
  const terminoDebounced = useDebouncedValue(termino, 300)

  // La regla exhaustive-deps pediria incluir `queryFn` en la clave. No se hace a
  // proposito: es una closure distinta en cada render, asi que la clave cambiaria
  // siempre y la cache no serviria de nada. Quien usa el componente aporta una
  // `queryKey` que ya identifica la consulta; es parte del contrato.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const { data, isLoading } = useQuery({
    queryKey: [...queryKey, terminoDebounced],
    queryFn: () => queryFn(terminoDebounced),
    // Solo se consulta con el diálogo abierto: cerrado no hay nada que mostrar.
    enabled: open,
  })

  const elementos = data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description !== undefined && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className='relative'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={termino}
            onChange={(event) => {
              setTermino(event.target.value)
            }}
            placeholder={searchPlaceholder}
            className='pl-9'
            autoFocus
          />
        </div>

        <ScrollArea className='h-72'>
          {isLoading ? (
            <div className='flex h-24 items-center justify-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='size-4 animate-spin' />
              Buscando...
            </div>
          ) : elementos.length === 0 ? (
            <div className='flex h-24 items-center justify-center text-sm text-muted-foreground'>
              {emptyMessage}
            </div>
          ) : (
            <ul className='divide-y'>
              {elementos.map((item) => {
                const id = getId(item)
                const yaElegido = selectedIds.includes(id)

                return (
                  <li key={id}>
                    <button
                      type='button'
                      disabled={yaElegido}
                      onClick={() => {
                        onSelect(item)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-sm hover:bg-muted',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        yaElegido && 'cursor-not-allowed text-muted-foreground'
                      )}
                    >
                      <span className='min-w-0 flex-1'>{renderItem(item)}</span>
                      {yaElegido && <Check className='size-4 shrink-0' />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
