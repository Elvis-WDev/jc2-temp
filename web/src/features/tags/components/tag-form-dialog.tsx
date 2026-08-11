import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '@/lib/api/api-error'
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
import { createTag, updateTag, type Tag } from '../api'

const formSchema = z.object({
  name: z.string().trim().min(1, 'The name is required.').max(120),
  category: z.string().trim().max(50).optional(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Presente = edicion. Ausente = alta. */
  tag?: Tag
}

/**
 * Alta y edicion de etiquetas.
 *
 * No se pide el slug: lo deriva el servidor del nombre, y es lo que hace que
 * "Behavioral Economics" y "behavioral economics" sean la misma etiqueta (RF-007).
 * Al editar se muestra como solo lectura, porque viaja en los filtros publicos y no
 * cambia al renombrar.
 */
export function TagFormDialog({ open, onOpenChange, tag }: Props) {
  const esEdicion = tag !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', category: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ name: tag?.name ?? '', category: tag?.category ?? '' })
    }
  }, [open, tag, form])

  const mutation = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        category: values.category === '' ? null : values.category,
      }
      return esEdicion ? updateTag(tag.id, payload) : createTag(payload)
    },
    invalidates: [queryKeys.tags.all],
    success: (guardada) =>
      esEdicion ? 'Tag updated.' : `Etiqueta "${guardada.name}" creada.`,
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (error) => {
      // Cuando el nombre ya existe se dice cual es, junto al campo, para poder
      // reutilizarla en lugar de crear una repetida.
      if (error instanceof ApiError && error.code === 'TAG_ALREADY_EXISTS') {
        form.setError('name', { type: 'server', message: error.message })
        return true
      }
      if (applyApiFieldErrors(form, error)) return true
      form.setError('root', {
        type: 'server',
        message:
          error instanceof ApiError ? error.message : 'It could not be saved.',
      })
      return true
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{esEdicion ? 'Edit tag' : 'New tag'}</DialogTitle>
          <DialogDescription>
            The same tag works for both work and courses.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='tag-form'
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(values)
            })}
            className='grid gap-4'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Behavioral Economics' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder='field, topic, method...' {...field} />
                  </FormControl>
                  <FormDescription>
                    Optional. Groups similar tags, for example by area or
                    method.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {esEdicion && (
              <div className='text-sm text-muted-foreground'>
                En las direcciones web aparece como{' '}
                <code className='rounded bg-muted px-1 py-0.5'>{tag.slug}</code>
                <p className='mt-1'>
                  That does not change even if you rename the tag, so links you
                  have already shared do not break.
                </p>
              </div>
            )}

            {form.formState.errors.root && (
              <p className='text-sm text-destructive' role='alert'>
                {form.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button type='submit' form='tag-form' disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
