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
import { Textarea } from '@/components/ui/textarea'
import {
  createCatalogTerm,
  NOMBRE_DE_CATALOGO,
  updateCatalogTerm,
  type Catalog,
  type CatalogTerm,
} from '../api'

const CODIGO = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

const formSchema = z.object({
  label: z.string().trim().min(1, 'Required.').max(120),
  code: z
    .string()
    .trim()
    .min(2, 'At least two characters.')
    .max(50)
    .regex(CODIGO, 'Lowercase words separated by underscores.'),
  description: z.string().trim().max(2000),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalog: Catalog
  term?: CatalogTerm
}

/** Deriva un código del nombre, como sugerencia editable. */
function sugerirCodigo(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

export function TermFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, catalog, term }: Omit<Props, 'open'>) {
  const esEdicion = term !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: term?.label ?? '',
      code: term?.code ?? '',
      description: term?.description ?? '',
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const description =
        values.description.trim() === '' ? null : values.description.trim()
      return esEdicion
        ? updateCatalogTerm(term.id, { label: values.label, description })
        : createCatalogTerm({
            catalog,
            code: values.code,
            label: values.label,
            description,
          })
    },
    invalidates: [queryKeys.catalogTerms.all],
    success: esEdicion ? 'Termino actualizado.' : 'Termino creado.',
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
          <DialogTitle>{esEdicion ? 'Edit term' : 'New term'}</DialogTitle>
          <DialogDescription>{NOMBRE_DE_CATALOGO[catalog]}</DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='label'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Replication material'
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    // Solo al crear: el codigo queda guardado en las filas y cambiarlo
                    // despues las dejaria apuntando a un termino que ya no existe.
                    if (!esEdicion && !form.getFieldState('code').isDirty) {
                      form.setValue('code', sugerirCodigo(event.target.value))
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                This is what is read in the dropdowns.
              </FormDescription>
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
                  placeholder='replication'
                  disabled={esEdicion}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {esEdicion
                  ? 'It cannot be changed: it is what was stored in the records that already use it.'
                  : 'It is stored in the records. It is only seen here.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>
                {catalog === 'course_level'
                  ? 'The intro that accompanies this group of courses on your site.'
                  : 'Optional. For now it is only shown on course levels.'}
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
