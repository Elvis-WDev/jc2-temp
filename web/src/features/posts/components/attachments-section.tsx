import { useState } from 'react'
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { StatusBadge } from '@/components/status-badge'
import {
  formatFileSize,
  listMedia,
  type MediaAsset,
} from '@/features/media/api'
import { UploadDialog } from '@/features/media/components/upload-dialog'

/**
 * Los archivos que acompanan a una entrada.
 *
 * Mismo gesto que los archivos de un trabajo —subir uno nuevo o reutilizar algo ya
 * subido— con una diferencia: aqui no hay catalogo de tipos. Un adjunto de una entrada
 * no es «el PDF del articulo» ni «el codigo de replicacion»; es lo que el titular
 * escriba en su rotulo, y con eso basta.
 */

export type AttachmentDraft = {
  mediaId: string
  filename: string
  label: string
  isPublic: boolean
}

type Props = {
  value: AttachmentDraft[]
  onChange: (files: AttachmentDraft[]) => void
}

export function AttachmentsSection({ value, onChange }: Props) {
  const [eligiendo, setEligiendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const anadir = (asset: MediaAsset) => {
    if (value.some((archivo) => archivo.mediaId === asset.id)) return
    onChange([
      ...value,
      {
        mediaId: asset.id,
        filename: asset.originalFilename,
        label: '',
        isPublic: asset.isPublic,
      },
    ])
  }

  const actualizar = (mediaId: string, cambios: Partial<AttachmentDraft>) => {
    onChange(
      value.map((archivo) =>
        archivo.mediaId === mediaId ? { ...archivo, ...cambios } : archivo
      )
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm text-muted-foreground'>
          Slides, a PDF, a dataset. Audio is played on the page itself. They are
          available from the entry once it is published.
        </p>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setEligiendo(true)
            }}
          >
            <Paperclip /> Choose an uploaded one
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
      </div>

      {value.length === 0 ? (
        <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
          No attachments.
        </p>
      ) : (
        <ul className='grid gap-3'>
          {value.map((archivo) => (
            <li
              key={archivo.mediaId}
              className='grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_14rem_auto]'
            >
              <div className='flex min-w-0 items-center gap-2'>
                <FileText
                  className='size-4 shrink-0 text-muted-foreground'
                  aria-hidden
                />
                <span className='truncate text-sm'>{archivo.filename}</span>
              </div>

              <div className='grid gap-1'>
                <Label
                  htmlFor={`rotulo-${archivo.mediaId}`}
                  className='text-xs'
                >
                  How it is named
                </Label>
                <Input
                  id={`rotulo-${archivo.mediaId}`}
                  value={archivo.label}
                  placeholder={archivo.filename}
                  onChange={(evento) => {
                    actualizar(archivo.mediaId, { label: evento.target.value })
                  }}
                />
              </div>

              <div className='flex items-end gap-2'>
                <div className='grid gap-1'>
                  <Label
                    htmlFor={`descargable-${archivo.mediaId}`}
                    className='text-xs'
                  >
                    Downloadable
                  </Label>
                  <Switch
                    id={`descargable-${archivo.mediaId}`}
                    checked={archivo.isPublic}
                    onCheckedChange={(marcado) => {
                      actualizar(archivo.mediaId, { isPublic: marcado })
                    }}
                  />
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={`Remove ${archivo.filename}`}
                  onClick={() => {
                    onChange(
                      value.filter(
                        (actual) => actual.mediaId !== archivo.mediaId
                      )
                    )
                  }}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <EntityPickerDialog<MediaAsset>
        open={eligiendo}
        onOpenChange={setEligiendo}
        title='Choose a file already uploaded'
        description='It avoids uploading the same document twice.'
        searchPlaceholder='Search files...'
        queryKey={queryKeys.media.all}
        queryFn={async () => {
          const { items } = await listMedia({ page: 1, page_size: 50 })
          return items
        }}
        getId={(asset) => asset.id}
        selectedIds={value.map((archivo) => archivo.mediaId)}
        onSelect={(asset) => {
          anadir(asset)
          setEligiendo(false)
        }}
        renderItem={(asset) => (
          <span className='flex items-center gap-2'>
            <span className='truncate'>{asset.originalFilename}</span>
            <StatusBadge tone='neutral' dot={false}>
              {formatFileSize(asset.sizeBytes)}
            </StatusBadge>
          </span>
        )}
        emptyMessage='No files uploaded yet.'
      />

      <UploadDialog
        open={subiendo}
        onOpenChange={setSubiendo}
        onUploaded={(asset) => {
          anadir(asset)
        }}
      />
    </div>
  )
}
