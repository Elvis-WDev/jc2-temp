import { Plus, Trash2 } from 'lucide-react'
import { conValorActual, useCatalogTerms } from '@/hooks/use-catalog-terms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

export type LinkDraft = {
  linkType: string
  label: string
  url: string
  isPublic: boolean
}

/** Cada tipo con el nombre que entiende quien rellena el formulario. */

type Props = {
  value: LinkDraft[]
  onChange: (links: LinkDraft[]) => void
}

export function LinksSection({ value, onChange }: Props) {
  const { terminos } = useCatalogTerms('work_link')

  const actualizar = (indice: number, cambios: Partial<LinkDraft>) => {
    onChange(
      value.map((link, i) => (i === indice ? { ...link, ...cambios } : link))
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='font-medium'>Links</h3>
          <p className='text-sm text-muted-foreground'>
            Addresses where the work or its material can be consulted.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            onChange([
              ...value,
              { linkType: 'publisher', label: '', url: '', isPublic: true },
            ])
          }}
        >
          <Plus /> Add link
        </Button>
      </div>

      {value.length === 0 ? (
        <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
          No links.
        </p>
      ) : (
        <ul className='grid gap-3'>
          {value.map((link, indice) => (
            <li
              key={indice}
              className='grid gap-3 rounded-md border p-3 sm:grid-cols-[10rem_1fr_auto]'
            >
              <div className='grid gap-1'>
                <Label htmlFor={`tipo-${String(indice)}`}>Type</Label>
                <Select
                  value={link.linkType}
                  onValueChange={(valor) => {
                    actualizar(indice, { linkType: valor })
                  }}
                >
                  <SelectTrigger id={`tipo-${String(indice)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conValorActual(terminos, link.linkType).map((tipo) => (
                      <SelectItem key={tipo.code} value={tipo.code}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-1'>
                <Label htmlFor={`url-${String(indice)}`}>Address</Label>
                <Input
                  id={`url-${String(indice)}`}
                  value={link.url}
                  placeholder='https://...'
                  onChange={(evento) => {
                    actualizar(indice, { url: evento.target.value })
                  }}
                />
              </div>

              <div className='flex items-end gap-2'>
                <div className='grid gap-1'>
                  <Label
                    htmlFor={`visible-${String(indice)}`}
                    className='text-xs'
                  >
                    Visible
                  </Label>
                  <Switch
                    id={`visible-${String(indice)}`}
                    checked={link.isPublic}
                    onCheckedChange={(marcado) => {
                      actualizar(indice, { isPublic: marcado })
                    }}
                  />
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='Remove link'
                  onClick={() => {
                    onChange(value.filter((_, i) => i !== indice))
                  }}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
