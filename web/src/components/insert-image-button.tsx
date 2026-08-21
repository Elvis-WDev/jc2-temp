import { useState } from 'react'
import { ImagePlus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { StatusBadge } from '@/components/status-badge'
import {
  formatFileSize,
  listMedia,
  type MediaAsset,
} from '@/features/media/api'
import { UploadDialog } from '@/features/media/components/upload-dialog'

/**
 * Intercalar una imagen en el cuerpo.
 *
 * El texto se escribe en Markdown, asi que una imagen es `![texto](direccion)`. Nadie
 * tiene esa direccion a mano —es la del archivo dentro de la biblioteca—, y pedirla
 * copiada de otra pantalla convertiria algo de un clic en un paseo. Este boton la
 * escribe por dentro.
 *
 * Solo acepta imagenes ya subidas aqui: es la misma regla que aplica el servidor al
 * sanear, donde una direccion de fuera se descarta para no contarle a ese servidor la IP
 * de cada visitante.
 */
export function InsertImageButton({
  onInsert,
}: {
  onInsert: (markdown: string) => void
}) {
  const [eligiendo, setEligiendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const insertar = (asset: MediaAsset) => {
    onInsert(`![${asset.altText ?? ''}](/api/public/media/${asset.id})`)
    if (!asset.isPublic) {
      // No se cambia por su cuenta: un archivo se hace publico por decision explicita.
      toast.warning('That image is not visible on the site yet', {
        description:
          'Open it in Files and turn on "Visible on the site", or it will show as a broken image once published.',
      })
    }
  }

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          setEligiendo(true)
        }}
      >
        <ImagePlus /> Insert an image
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          setSubiendo(true)
        }}
      >
        <Upload /> Upload and insert
      </Button>

      <EntityPickerDialog<MediaAsset>
        open={eligiendo}
        onOpenChange={setEligiendo}
        title='Choose an image'
        description='It is written into the text where the cursor was. Only images uploaded here.'
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
        selectedIds={[]}
        onSelect={(asset) => {
          insertar(asset)
          setEligiendo(false)
        }}
        renderItem={(asset) => (
          <span className='flex items-center justify-between gap-2'>
            <span className='truncate'>{asset.originalFilename}</span>
            <span className='flex items-center gap-2'>
              {!asset.isPublic && (
                <StatusBadge tone='warning' dot={false}>
                  Not visible
                </StatusBadge>
              )}
              <span className='text-xs text-muted-foreground'>
                {formatFileSize(asset.sizeBytes)}
              </span>
            </span>
          </span>
        )}
        emptyMessage='No images uploaded yet.'
      />

      <UploadDialog
        open={subiendo}
        onOpenChange={setSubiendo}
        purpose='image'
        onUploaded={insertar}
      />
    </div>
  )
}
