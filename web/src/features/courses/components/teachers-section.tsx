import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { searchPersons, type Person } from '@/features/persons/api'

/**
 * Quién impartió una edición.
 *
 * Antes solo había un texto libre con el papel, sin forma de enlazar la ficha de nadie.
 * Aquí se eligen personas concretas de Autores, cada una con su papel en esa edición.
 */

export type TeacherDraft = { personId: string; fullName: string; role: string }

type Props = {
  value: TeacherDraft[]
  onChange: (docentes: TeacherDraft[]) => void
}

export function TeachersSection({ value, onChange }: Props) {
  const [eligiendo, setEligiendo] = useState(false)

  const actualizar = (indice: number, cambios: Partial<TeacherDraft>) => {
    onChange(
      value.map((docente, i) =>
        i === indice ? { ...docente, ...cambios } : docente
      )
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <Label>Who teaches it</Label>
          <p className='text-sm text-muted-foreground'>
            Chosen from Authors. The order is the one shown on the site.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setEligiendo(true)
          }}
        >
          <Plus /> Add person
        </Button>
      </div>

      {value.length === 0 ? (
        <p className='rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground'>
          No teachers. Optional.
        </p>
      ) : (
        <ul className='grid gap-2'>
          {value.map((docente, indice) => (
            <li
              key={docente.personId}
              className='grid gap-2 rounded-md border px-3 py-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center'
            >
              <span className='truncate text-sm font-medium'>
                {docente.fullName}
              </span>
              <Input
                placeholder='Responsable, co-docente...'
                aria-label={`Role of ${docente.fullName}`}
                value={docente.role}
                onChange={(evento) => {
                  actualizar(indice, { role: evento.target.value })
                }}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label={`Remove ${docente.fullName}`}
                onClick={() => {
                  onChange(value.filter((_, i) => i !== indice))
                }}
              >
                <X className='size-4' />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <EntityPickerDialog<Person>
        open={eligiendo}
        onOpenChange={setEligiendo}
        title='Add teacher'
        description='Search by name. If the person does not exist, create them first in Authors.'
        searchPlaceholder='Search for a person...'
        queryKey={queryKeys.persons.all}
        queryFn={(q) => searchPersons(q)}
        getId={(persona) => persona.id}
        selectedIds={value.map((docente) => docente.personId)}
        onSelect={(persona) => {
          onChange([
            ...value,
            { personId: persona.id, fullName: persona.fullName, role: '' },
          ])
          setEligiendo(false)
        }}
        renderItem={(persona) => <span>{persona.fullName}</span>}
        emptyMessage='No person matches the search.'
      />
    </div>
  )
}
