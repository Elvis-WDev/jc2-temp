import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { StatusBadge } from '@/components/status-badge'
import { listTags, type Tag } from '@/features/tags/api'

export type TagDraft = { id: string; name: string }

type Props = {
  value: TagDraft[]
  onChange: (tags: TagDraft[]) => void
}

/** Etiquetas. Se eligen de las que ya existen, no se escriben libres. */
export function TagsSection({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className='grid gap-3'>
      <div className='flex items-center justify-between'>
        {/* Sin frase de ayuda: «Tags» ya lo dice, y la que habia —«dejan filtrar
            tu trabajo por tema»— repetia lo que se ve al usarlas. */}
        <h3 className='font-medium'>Tags</h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setAbierto(true)
          }}
        >
          <Plus /> Add tag
        </Button>
      </div>

      {value.length === 0 ? (
        <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
          No tags.
        </p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {value.map((tag) => (
            <span key={tag.id} className='inline-flex items-center gap-1'>
              <StatusBadge tone='info' dot={false}>
                {tag.name}
              </StatusBadge>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-6'
                aria-label={`Remove ${tag.name}`}
                onClick={() => {
                  onChange(value.filter((actual) => actual.id !== tag.id))
                }}
              >
                <X className='size-3' />
              </Button>
            </span>
          ))}
        </div>
      )}

      <EntityPickerDialog<Tag>
        open={abierto}
        onOpenChange={setAbierto}
        title='Add tag'
        description='Search among the existing tags. To create a new one, go to Tags.'
        searchPlaceholder='Search for a tag...'
        queryKey={queryKeys.tags.all}
        queryFn={async (q) => {
          const { items } = await listTags({
            page: 1,
            page_size: 20,
            ...(q === '' ? {} : { q }),
          })
          return items
        }}
        getId={(tag) => tag.id}
        selectedIds={value.map((tag) => tag.id)}
        onSelect={(tag) => {
          onChange([...value, { id: tag.id, name: tag.name }])
          setAbierto(false)
        }}
        renderItem={(tag) => (
          <span>
            {tag.name}
            {tag.category !== null && (
              <span className='ms-2 text-xs text-muted-foreground'>
                {tag.category}
              </span>
            )}
          </span>
        )}
        emptyMessage='No tags match.'
      />
    </div>
  )
}
