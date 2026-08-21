import { useState } from 'react'
import { FileText, Paperclip, Trash2, Upload } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { conValorActual, useCatalogTerms } from '@/hooks/use-catalog-terms'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EntityPickerDialog } from '@/components/entity-picker-dialog'
import { StatusBadge } from '@/components/status-badge'
import {
  formatFileSize,
  listMedia,
  type MediaAsset,
} from '@/features/media/api'
import { UploadDialog } from '@/features/media/components/upload-dialog'

export type FileDraft = {
  mediaId: string
  filename: string
  fileType: string
  isPublic: boolean
}

/** Para que sirve cada archivo dentro del trabajo. */

type Props = {
  value: FileDraft[]
  onChange: (files: FileDraft[]) => void
}

/**
 * Archivos adjuntos al trabajo.
 *
 * Se puede subir uno nuevo o reutilizar algo ya subido, para no tener el mismo PDF
 * duplicado en dos trabajos.
 */
export function FilesSection({ value, onChange }: Props) {
  const { terminos } = useCatalogTerms('work_file')

  const [eligiendo, setEligiendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const anadir = (asset: MediaAsset) => {
    if (value.some((archivo) => archivo.mediaId === asset.id)) return
    onChange([
      ...value,
      {
        mediaId: asset.id,
        filename: asset.originalFilename,
        fileType: 'paper_pdf',
        isPublic: asset.isPublic,
      },
    ])
  }

  const actualizar = (mediaId: string, cambios: Partial<FileDraft>) => {
    onChange(
      value.map((archivo) =>
        archivo.mediaId === mediaId ? { ...archivo, ...cambios } : archivo
      )
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='font-medium'>Files</h3>
          <p className='text-sm text-muted-foreground'>
            The PDF of the paper, its appendices, the data or the code.
          </p>
        </div>
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
            <Upload /> Upload new
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
          No files.
        </p>
      ) : (
        <ul className='grid gap-3'>
          {value.map((archivo) => (
            <li
              key={archivo.mediaId}
              className='grid gap-3 rounded-md border p-3 sm:grid-cols-[1fr_12rem_auto]'
            >
              <div className='flex min-w-0 items-center gap-2'>
                <FileText
                  className='size-4 shrink-0 text-muted-foreground'
                  aria-hidden
                />
                <span className='truncate text-sm'>{archivo.filename}</span>
              </div>

              <div className='grid gap-1'>
                <Label htmlFor={`tipo-${archivo.mediaId}`} className='text-xs'>
                  What it is for
                </Label>
                <Select
                  value={archivo.fileType}
                  onValueChange={(valor) => {
                    actualizar(archivo.mediaId, { fileType: valor })
                  }}
                >
                  <SelectTrigger id={`tipo-${archivo.mediaId}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conValorActual(terminos, archivo.fileType).map((tipo) => (
                      <SelectItem key={tipo.code} value={tipo.code}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
        description='It avoids duplicating the same document across several works.'
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
