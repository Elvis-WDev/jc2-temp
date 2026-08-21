import { useState } from 'react'
import { Plus } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { SortableList } from '@/components/sortable-list'
import { searchPersons, type Person } from '@/features/persons/api'

/** Autor tal como lo maneja el formulario, antes de enviarlo. */
export type AuthorDraft = {
  personId: string
  fullName: string
  contributionRole: string | null
  isCorresponding: boolean
}

type Props = {
  value: AuthorDraft[]
  onChange: (authors: AuthorDraft[]) => void
}

/**
 * Autoria de un trabajo (ERS §16, RF-006).
 *
 * El orden es informacion academica, no presentacion: quien firma primero importa.
 * Por eso se reordena explicitamente y el numero de posicion esta a la vista.
 *
 * `authorOrder` no se edita a mano: se deriva de la posicion en la lista al enviar,
 * lo que garantiza la secuencia 1..N sin huecos que exige el backend.
 */
export function AuthorsSection({ value, onChange }: Props) {
  const [selectorAbierto, setSelectorAbierto] = useState(false)

  const anadir = (persona: Person) => {
    onChange([
      ...value,
      {
        personId: persona.id,
        fullName: persona.fullName,
        contributionRole: null,
        isCorresponding: false,
      },
    ])
    setSelectorAbierto(false)
  }

  const marcarCorresponding = (personId: string, marcado: boolean) => {
    onChange(
      value.map((autor) =>
        autor.personId === personId
          ? { ...autor, isCorresponding: marcado }
          : autor
      )
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>Authors</h3>
          <p className='text-sm text-muted-foreground'>
            In the order they sign.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setSelectorAbierto(true)
          }}
        >
          <Plus /> Add author
        </Button>
      </div>

      <SortableList
        items={value}
        getId={(autor) => autor.personId}
        onReorder={onChange}
        onRemove={(autor) => {
          onChange(value.filter((actual) => actual.personId !== autor.personId))
        }}
        emptyMessage='No authors. You need at least one to publish.'
        renderItem={(autor) => (
          <div className='flex flex-wrap items-center gap-2'>
            <span className='truncate text-sm'>{autor.fullName}</span>
            {autor.isCorresponding && (
              <Badge variant='secondary'>Corresponding</Badge>
            )}
            <label className='ms-auto flex items-center gap-1.5 text-xs text-muted-foreground'>
              <Checkbox
                checked={autor.isCorresponding}
                onCheckedChange={(marcado) => {
                  marcarCorresponding(autor.personId, marcado === true)
                }}
              />
              Corresponding
            </label>
          </div>
        )}
      />

      <EntityPickerDialog<Person>
        open={selectorAbierto}
        onOpenChange={setSelectorAbierto}
        title='Add author'
        description='Search by name. If the person does not exist, create them first in Authors.'
        searchPlaceholder='Search for a person...'
        queryKey={queryKeys.persons.all}
        queryFn={searchPersons}
        getId={(persona) => persona.id}
        selectedIds={value.map((autor) => autor.personId)}
        onSelect={anadir}
        renderItem={(persona) => (
          <span>
            {persona.fullName}
            {persona.orcid !== null && (
              <span className='ms-2 text-xs text-muted-foreground'>
                {persona.orcid}
              </span>
            )}
          </span>
        )}
        emptyMessage='No people match.'
      />
    </div>
  )
}
