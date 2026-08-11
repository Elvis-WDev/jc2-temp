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
import {
  createCitationStyle,
  updateCitationStyle,
  type CitationStyle,
} from '../api'

const CODIGO = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

const formSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'At least two characters.')
    .max(50)
    .regex(CODIGO, 'Lowercase words separated by underscores.'),
  extension: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+$/, 'Lowercase letters and digits only, without the dot.')
    .or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  style?: CitationStyle
}

function sugerirCodigo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export function StyleFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, style }: Omit<Props, 'open'>) {
  const esEdicion = style !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: style?.name ?? '',
      code: style?.code ?? '',
      extension: style?.extension ?? '',
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const extension =
        values.extension.trim() === '' ? null : values.extension.trim()
      return esEdicion
        ? updateCitationStyle(style.id, { name: values.name, extension })
        : createCitationStyle({
            code: values.code,
            name: values.name,
            extension,
          })
    },
    invalidates: [queryKeys.citationStyles.all],
    success: esEdicion ? 'Estilo actualizado.' : 'Estilo creado.',
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
          <DialogTitle>{esEdicion ? 'Edit style' : 'New style'}</DialogTitle>
          <DialogDescription>
            A format in which to write the citation of a work.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Vancouver'
                  {...field}
                  onChange={(evento) => {
                    field.onChange(evento)
                    if (!esEdicion && !form.getFieldState('code').isDirty) {
                      form.setValue('code', sugerirCodigo(evento.target.value))
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input
                  placeholder='vancouver'
                  disabled={esEdicion}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {esEdicion
                  ? 'It cannot be changed: it identifies the style in citations already written.'
                  : 'Only you see it here.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='extension'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Download extension</FormLabel>
              <FormControl>
                <Input placeholder='bib' {...field} />
              </FormControl>
              <FormDescription>
                Without the dot. Leave it empty if the citation is plain text.
              </FormDescription>
              <FormMessage />
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
            {esEdicion ? 'Save' : 'Crear'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
