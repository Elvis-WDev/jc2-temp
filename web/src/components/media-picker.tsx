import { useState } from 'react'
import { FileText, ImageIcon, Search, Upload, X } from 'lucide-react'
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
 * Elegir un archivo: uno ya subido o uno nuevo.
 *
 * El formulario guarda un identificador, pero quien lo usa ve el archivo. Una imagen se
 * reconoce de un vistazo y un documento no, asi que la vista previa cambia: miniatura
 * en un caso, nombre que se puede abrir en el otro. Lo demas —buscar entre los subidos,
 * subir uno nuevo, quitar el elegido— es el mismo gesto para los dos y vive una sola
 * vez aqui.
 */

const API = import.meta.env.VITE_API_URL ?? ''

type Tipo = 'image' | 'document'

type Props = {
  /** Identificador del archivo elegido, o null. */
  value: string | null
  onChange: (mediaId: string | null) => void
  /** Nombre del archivo elegido, si se conoce. Solo informativo. */
  filename?: string | null
}

const TEXTOS: Record<
  Tipo,
  {
    vacio: string
    elegido: string
    quitar: string
    titulo: string
    descripcion: string
    sinNada: string
  }
> = {
  image: {
    vacio: 'No image',
    elegido: 'Chosen image',
    quitar: 'Remove the image',
    titulo: 'Choose an image',
    descripcion: 'Only images already uploaded are listed.',
    sinNada: 'No images uploaded yet.',
  },
  document: {
    vacio: 'No document',
    elegido: 'Chosen document',
    quitar: 'Remove the document',
    titulo: 'Choose a document',
    descripcion: 'Only documents already uploaded are listed.',
    sinNada: 'No documents uploaded yet.',
  },
}

function MediaPicker({
  tipo,
  value,
  onChange,
  filename,
}: Props & { tipo: Tipo }) {
  const [eligiendo, setEligiendo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [nombre, setNombre] = useState<string | null>(filename ?? null)
  const texto = TEXTOS[tipo]

  return (
    <div className='grid gap-2'>
      {value === null ? (
        <div className='flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground'>
          {tipo === 'image' ? (
            <ImageIcon className='size-6' aria-hidden />
          ) : (
            <FileText className='size-6' aria-hidden />
          )}
          {texto.vacio}
        </div>
      ) : (
        <div className='flex items-center gap-3 rounded-md border p-2'>
          {tipo === 'image' ? (
            <img
              src={`${API}/api/admin/media/${value}/download`}
              alt=''
              // La API esta en otro origen: sin esto el navegador no manda la cookie de
              // sesion y la imagen privada no cargaria.
              crossOrigin='use-credentials'
              className='size-16 shrink-0 rounded bg-muted object-cover'
            />
          ) : (
            <FileText
              className='size-6 shrink-0 text-muted-foreground'
              aria-hidden
            />
          )}
          {/* Un documento no se reconoce por una miniatura. Se abre para comprobar que
              es el que se cree, que es la unica forma de estar seguro cuando lo unico
              guardado es un identificador. */}
          <a
            href={`${API}/api/admin/media/${value}/download`}
            target='_blank'
            rel='noreferrer'
            className='min-w-0 flex-1 truncate text-sm underline-offset-4 hover:underline'
          >
            {nombre ?? texto.elegido}
          </a>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={texto.quitar}
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
        title={texto.titulo}
        description={texto.descripcion}
        searchPlaceholder='Search by file name...'
        queryKey={queryKeys.media.list({ kind: tipo })}
        queryFn={async (q) => {
          const { items } = await listMedia({
            page: 1,
            page_size: 20,
            kind: tipo,
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
        emptyMessage={texto.sinNada}
      />

      <UploadDialog
        open={subiendo}
        onOpenChange={setSubiendo}
        purpose={tipo}
        onUploaded={(asset) => {
          onChange(asset.id)
          setNombre(asset.originalFilename)
        }}
      />
    </div>
  )
}

export function ImagePicker(props: Props) {
  return <MediaPicker tipo='image' {...props} />
}

export function DocumentPicker(props: Props) {
  return <MediaPicker tipo='document' {...props} />
}
