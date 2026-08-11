import { useState } from 'react'
import { ImageIcon, Search, Upload, X } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import {
  formatFileSize,
  listMedia,
  type MediaAsset,
} from '@/features/media/api'
import { UploadDialog } from '@/features/media/components/upload-dialog'

/**
 * Elegir una imagen: una ya subida o una nueva.
 *
 * El formulario guarda un identificador, pero quien lo usa ve la imagen. La miniatura se
 * pide con las credenciales de la sesión porque la API vive en otro origen y el archivo
 * puede ser privado; junto a ella siempre va el nombre, así que si no carga se sigue
 * sabiendo cuál está elegida.
 */

const API = import.meta.env.VITE_API_URL ?? ''

type Props = {
  /** Identificador del archivo elegido, o null. */
  value: string | null
  onChange: (mediaId: string | null) => void
  /** Nombre del archivo elegido, si se conoce. Solo informativo. */
  filename?: string | null
}

export function ImagePicker({ value, onChange, filename }: Props) {
  const [eligiendo, setEligiendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [nombre, setNombre] = useState<string | null>(filename ?? null)

  return (
    <div className='grid gap-2'>
      {value === null ? (
        <div className='flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground'>
          <ImageIcon className='size-6' aria-hidden />
          No image
        </div>
      ) : (
        <div className='flex items-center gap-3 rounded-md border p-2'>
          <img
            src={`${API}/api/admin/media/${value}/download`}
            alt=''
            // La API esta en otro origen: sin esto el navegador no manda la cookie de
            // sesion y la imagen privada no cargaria.
            crossOrigin='use-credentials'
            className='size-16 shrink-0 rounded bg-muted object-cover'
          />
          <span className='min-w-0 flex-1 truncate text-sm'>
            {nombre ?? 'Chosen image'}
          </span>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label='Remove the image'
            onClick={() => {
              onChange(null)
              setNombre(null)
            }}
          >
            <X className='size-4' />
          </Button>
        </div>
      )}

      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setEligiendo(true)
          }}
        >
          <Search /> Choose an uploaded one
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setSubiendo(true)
          }}
        >
          <Upload /> Upload a new one
        </Button>
      </div>

      <EntityPickerDialog<MediaAsset>
        open={eligiendo}
        onOpenChange={setEligiendo}
        title='Choose an image'
        description='Only images already uploaded are listed.'
        searchPlaceholder='Search by file name...'
        queryKey={queryKeys.media.list({ kind: 'image' })}
        queryFn={async (q) => {
          const { items } = await listMedia({
            page: 1,
            page_size: 20,
            kind: 'image',
            ...(q === '' ? {} : { q }),
          })
          return items
        }}
        getId={(asset) => asset.id}
        selectedIds={value === null ? [] : [value]}
        onSelect={(asset) => {
          onChange(asset.id)
          setNombre(asset.originalFilename)
          setEligiendo(false)
        }}
        renderItem={(asset) => (
          <span className='flex items-center justify-between gap-2'>
            <span className='truncate'>{asset.originalFilename}</span>
            <span className='text-xs text-muted-foreground'>
              {formatFileSize(asset.sizeBytes)}
            </span>
          </span>
        )}
        emptyMessage='No images uploaded yet.'
      />

      <UploadDialog
        open={subiendo}
        onOpenChange={setSubiendo}
        purpose='image'
        onUploaded={(asset) => {
          onChange(asset.id)
          setNombre(asset.originalFilename)
        }}
      />
    </div>
  )
}
