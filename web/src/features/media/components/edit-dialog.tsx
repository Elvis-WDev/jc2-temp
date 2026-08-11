import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { formatFileSize, updateMediaMetadata, type MediaAsset } from '../api'

/**
 * Ficha de un archivo ya subido.
 *
 * El archivo en sí no se toca: para cambiarlo hay que subir otro. Lo que se edita es lo
 * que lo acompaña, que es de donde sale el texto que ve quien visita la web.
 */

const formSchema = z.object({
  altText: z.string().trim().max(1000),
  caption: z.string().trim().max(2000),
  credit: z.string().trim().max(500),
  isPublic: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: MediaAsset
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

export function EditMediaDialog({ open, onOpenChange, asset }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        {/* Se monta de nuevo en cada apertura, asi que el formulario arranca con los
            datos del archivo elegido sin tener que sincronizarlos a mano. */}
        <Campos onOpenChange={onOpenChange} asset={asset} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, asset }: Omit<Props, 'open'>) {
  const esImagen = asset.mimeType.startsWith('image/')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      altText: asset.altText ?? '',
      caption: asset.caption ?? '',
      credit: asset.credit ?? '',
      isPublic: asset.isPublic,
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) =>
      updateMediaMetadata(asset.id, {
        altText: vacioANull(values.altText),
        caption: vacioANull(values.caption),
        credit: vacioANull(values.credit),
        isPublic: values.isPublic,
      }),
    invalidates: [queryKeys.media.all],
    success: 'File updated.',
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (error) => applyApiFieldErrors(form, error),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          guardar.mutate(values)
        })}
        className='grid gap-4'
      >
        <DialogHeader>
          <DialogTitle className='truncate'>
            {asset.originalFilename}
          </DialogTitle>
          <DialogDescription>
            {formatFileSize(asset.sizeBytes)}. The file does not change; to
            sustituirlo, sube uno nuevo.
          </DialogDescription>
        </DialogHeader>

        {/* Solo en imagenes: describir un ZIP para quien no puede verlo no significa
            nada, y un campo que no aplica solo estorba. */}
        {esImagen && (
          <FormField
            control={form.control}
            name='altText'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image description</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Profile portrait on a light background'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  It is read by those who browse without seeing the image.
                  Describe what it shows.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name='caption'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Footer</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormDescription>
                It appears next to the file on the site.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='credit'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit</FormLabel>
              <FormControl>
                <Input placeholder='Photo: name of the author' {...field} />
              </FormControl>
              <FormDescription>
                Where it comes from, if it needs crediting.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isPublic'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='visible-en-la-web'>Visible on the site</Label>
                {/* Marcarlo no basta: un archivo solo se descarga desde la web si
                    ademas cuelga de un trabajo o un curso ya publicado. Decir
                    "cualquiera podra descargarlo" seria falso mientras no lo uses. */}
                <p className='text-xs text-muted-foreground'>
                  {field.value
                    ? 'It will be downloadable from the site as soon as you use it in something published.'
                    : 'It will not be downloadable from the site even if you use it in something published.'}
                </p>
              </div>
              <FormControl>
                <Switch
                  id='visible-en-la-web'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={guardar.isPending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button type='submit' disabled={guardar.isPending}>
            {guardar.isPending && <Loader2 className='animate-spin' />}
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
