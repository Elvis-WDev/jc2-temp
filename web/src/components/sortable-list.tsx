import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * Lista reordenable con botones.
 *
 * La usan el orden de autoría de un trabajo (ERS §16: 1..N sin huecos) y el orden de
 * los destacados de Home.
 *
 * Se reordena con botones y no arrastrando: arrastrar no es accesible por teclado ni
 * cómodo en táctil, y `docs/quality/frontend-checklist.md` exige ambos. Los botones
 * llevan nombre accesible y funcionan igual con ratón, dedo y teclado. Si más adelante
 * se añade arrastrar, debe ser *además* de esto, nunca en su lugar.
 */

export type SortableListProps<T> = {
  items: T[]
  getId: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactNode

  onReorder: (items: T[]) => void
  onRemove?: (item: T) => void

  emptyMessage?: string
  className?: string
}

function mover<T>(items: T[], desde: number, hacia: number): T[] {
  const copia = [...items]
  const [elemento] = copia.splice(desde, 1)
  if (elemento === undefined) return items
  copia.splice(hacia, 0, elemento)
  return copia
}

export function SortableList<T>({
  items,
  getId,
  renderItem,
  onReorder,
  onRemove,
  emptyMessage = 'No items yet.',
  className,
}: SortableListProps<T>) {
  if (items.length === 0) {
    return (
      <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className={cn('divide-y rounded-md border', className)}>
      {items.map((item, index) => {
        const esPrimero = index === 0
        const esUltimo = index === items.length - 1
        const posicion = index + 1

        return (
          <li key={getId(item)} className='flex items-center gap-2 p-2'>
            <GripVertical
              className='size-4 shrink-0 text-muted-foreground'
              aria-hidden
            />
            {/* El número de orden es información, no decoración: en autoría academica
                importa quién va primero. */}
            <span className='w-6 shrink-0 text-sm text-muted-foreground tabular-nums'>
              {posicion}
            </span>

            <div className='min-w-0 flex-1'>{renderItem(item, index)}</div>

            <div className='flex shrink-0 items-center gap-1'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={esPrimero}
                aria-label={`Move up to position ${String(posicion - 1)}`}
                onClick={() => {
                  onReorder(mover(items, index, index - 1))
                }}
              >
                <ChevronUp className='size-4' />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                disabled={esUltimo}
                aria-label={`Move down to position ${String(posicion + 1)}`}
                onClick={() => {
                  onReorder(mover(items, index, index + 1))
                }}
              >
                <ChevronDown className='size-4' />
              </Button>
              {onRemove !== undefined && (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={`Remove item ${String(posicion)}`}
                  onClick={() => {
                    onRemove(item)
                  }}
                >
                  <X className='size-4' />
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
