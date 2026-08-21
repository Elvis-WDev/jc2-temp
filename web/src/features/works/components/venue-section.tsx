import { useState } from 'react'
import { BookMarked, Search, X } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { StatusBadge } from '@/components/status-badge'
import { listVenues, type Venue } from '@/features/venues/api'

/**
 * Dónde se publicó el trabajo.
 *
 * Dos formas excluyentes, y la interfaz lo plantea como una elección desde el principio
 * en lugar de dejar que la API responda 422:
 *
 * - **Una ficha** de Publicaciones: se escribe una vez y trae consigo el ISSN, el
 *   ranking y el CiteScore.
 * - **Texto suelto**, para lo que no merece ficha: una nota interna, un borrador.
 */

export type VenueDraft = { venueId: string | null; venueName: string }

type Props = {
  value: VenueDraft
  onChange: (valor: VenueDraft) => void
  /** Nombre de la ficha ya elegida, para poder mostrarlo sin otra consulta. */
  nombreFicha?: string | null
}

export function VenueSection({ value, onChange, nombreFicha }: Props) {
  const [eligiendo, setEligiendo] = useState(false)
  const [nombre, setNombre] = useState<string | null>(nombreFicha ?? null)

  return (
    <div className='grid gap-3'>
      {/* El titulo lo pone la tarjeta que envuelve: repetirlo aqui era decir lo
          mismo dos veces seguidas. */}
      <p className='text-sm text-muted-foreground'>
        Pick one from your list, or type a loose name.
      </p>

      {value.venueId === null ? (
        <div className='grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end'>
          <div className='grid gap-1'>
            <Label htmlFor='venue-suelto'>Loose name</Label>
            <Input
              id='venue-suelto'
              placeholder='Internal working paper, seminar...'
              value={value.venueName}
              onChange={(event) => {
                onChange({ venueId: null, venueName: event.target.value })
              }}
            />
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              setEligiendo(true)
            }}
          >
            <Search /> Choose from my list
          </Button>
        </div>
      ) : (
        <div className='flex items-center gap-3 rounded-md border px-3 py-2'>
          <BookMarked
            className='size-4 shrink-0 text-muted-foreground'
            aria-hidden
          />
          <span className='min-w-0 flex-1 truncate text-sm font-medium'>
            {nombre ?? 'Chosen venue'}
          </span>
          <StatusBadge tone='info' dot={false}>
            From your list
          </StatusBadge>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Remove the venue'
            onClick={() => {
              onChange({ venueId: null, venueName: '' })
              setNombre(null)
            }}
          >
            <X className='size-4' />
          </Button>
        </div>
      )}

      <EntityPickerDialog<Venue>
        open={eligiendo}
        onOpenChange={setEligiendo}
        title='Choose venue'
        description='Search among your venues. To create a new one, go to Venues.'
        searchPlaceholder='Search by name, abbreviation or ISSN...'
        queryKey={queryKeys.venues.all}
        queryFn={async (q) => {
          const { items } = await listVenues({
            page: 1,
            page_size: 20,
            active: 'true',
            ...(q === '' ? {} : { q }),
          })
          return items
        }}
        getId={(venue) => venue.id}
        selectedIds={value.venueId === null ? [] : [value.venueId]}
        onSelect={(venue) => {
          // Al elegir ficha se borra el texto suelto: son excluyentes, y dejar los dos
          // haria que la API rechazara el guardado.
          onChange({ venueId: venue.id, venueName: '' })
          setNombre(venue.name)
          setEligiendo(false)
        }}
        renderItem={(venue) => (
          <span className='flex items-center justify-between gap-2'>
            <span className='truncate'>{venue.name}</span>
            {venue.ranking !== null && (
              <span className='text-xs text-muted-foreground'>
                {venue.ranking}
              </span>
            )}
          </span>
        )}
        emptyMessage='No venues match.'
      />
    </div>
  )
}
