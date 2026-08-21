import { useRef, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  MEDIA_PURPOSES,
  PURPOSE_LABELS,
  formatFileSize,
  uploadMedia,
  type MediaAsset,
  type MediaPurpose,
} from '../api'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Proposito fijo cuando se sube desde un formulario concreto. */
  purpose?: MediaPurpose
  onUploaded?: (asset: MediaAsset) => void
}

export function UploadDialog({
  open,
  onOpenChange,
  purpose,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipo, setTipo] = useState<MediaPurpose>(purpose ?? 'document')
  const [publico, setPublico] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => {
    setArchivo(null)
    setProgreso(0)
    setError(null)
    onOpenChange(false)
  }

  const subir = useToastMutation({
    mutationFn: (file: File) =>
      uploadMedia(
        file,
        { purpose: tipo, visibility: publico ? 'public' : 'private' },
        setProgreso
      ),
    invalidates: [queryKeys.media.all],
    success: (asset) => `"${asset.originalFilename}" subido.`,
    onSuccess: (asset) => {
      onUploaded?.(asset)
      cerrar()
    },
    onError: (fallo) => {
      setProgreso(0)
      // El servidor comprueba el contenido real del archivo, no su extension. Se
      // muestra dentro del dialogo para poder corregir sin volver a empezar.
      setError(
        fallo instanceof ApiError
          ? fallo.message
          : 'The file could not be uploaded.'
      )
      return true
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) cerrar()
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            Se acepta segun para que sea: {PURPOSE_LABELS[tipo].accepts}.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          {purpose === undefined && (
            <div className='grid gap-2'>
              <Label htmlFor='proposito'>What it is for</Label>
              <Select
                value={tipo}
                onValueChange={(valor) => {
                  setTipo(valor as MediaPurpose)
                  setError(null)
                }}
              >
                <SelectTrigger id='proposito'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIA_PURPOSES.map((valor) => (
                    <SelectItem key={valor} value={valor}>
                      {PURPOSE_LABELS[valor].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <input
            ref={inputRef}
            type='file'
            className='sr-only'
            onChange={(evento) => {
              setArchivo(evento.target.files?.[0] ?? null)
              setError(null)
            }}
          />

          {archivo === null ? (
            <button
              type='button'
              onClick={() => inputRef.current?.click()}
              className='flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-8 text-sm transition-colors hover:border-primary hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <UploadCloud
                className='size-6 text-muted-foreground'
                aria-hidden
              />
              <span>Choose file</span>
              <span className='text-xs text-muted-foreground'>
                {PURPOSE_LABELS[tipo].accepts}
              </span>
            </button>
          ) : (
            <div className='flex items-center gap-3 rounded-lg border px-3 py-2'>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{archivo.name}</p>
                <p className='text-xs text-muted-foreground'>
                  {formatFileSize(archivo.size)}
                </p>
              </div>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Remove file'
                disabled={subir.isPending}
                onClick={() => {
                  setArchivo(null)
                  setError(null)
                }}
              >
                <X className='size-4' />
              </Button>
            </div>
          )}

          <div className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
            <div>
              <Label htmlFor='publico'>Visible on the site</Label>
              <p className='text-xs text-muted-foreground'>
                {publico
                  ? 'It will be downloadable from the site as soon as you use it in something published.'
                  : 'It will not be downloadable from the site even if you use it in something published.'}
              </p>
            </div>
            <Switch
              id='publico'
              checked={publico}
              onCheckedChange={setPublico}
            />
          </div>

          {subir.isPending && <Progress value={progreso} />}

          {error !== null && (
            <p
              className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'
              role='alert'
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' disabled={subir.isPending} onClick={cerrar}>
            Cancel
          </Button>
          <Button
            disabled={archivo === null || subir.isPending}
            onClick={() => {
              if (archivo !== null) subir.mutate(archivo)
            }}
          >
            {subir.isPending ? `Uploading ${String(progreso)}%` : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
