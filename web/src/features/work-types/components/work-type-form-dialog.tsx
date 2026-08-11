import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/api-error'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
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
import { createWorkType, updateWorkType, type WorkType } from '../api'

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_]{1,49}$/,
      'Lowercase letters, digits and underscores only; it must start with a letter.'
    ),
  label: z.string().trim().min(1, 'Required.').max(100),
  pluralLabel: z.string().trim().min(1, 'Required.').max(120),
  // Texto y no numero: un campo numerico vacio da NaN y rompe el resolver antes de
  // poder mostrar un mensaje util.
  maxItemsHome: z
    .string()
    .refine(
      (valor) => valor === '' || (/^\d+$/.test(valor) && Number(valor) <= 100),
      'Write a number from 0 to 100.'
    ),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workType?: WorkType
}

export function WorkTypeFormDialog({ open, onOpenChange, workType }: Props) {
  const queryClient = useQueryClient()
  const esEdicion = workType !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', label: '', pluralLabel: '', maxItemsHome: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        code: workType?.code ?? '',
        label: workType?.label ?? '',
        pluralLabel: workType?.pluralLabel ?? '',
        maxItemsHome:
          workType?.maxItemsHome === null ||
          workType?.maxItemsHome === undefined
            ? ''
            : String(workType.maxItemsHome),
      })
    }
  }, [open, workType, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      esEdicion
        ? updateWorkType(workType.id, {
            label: values.label,
            pluralLabel: values.pluralLabel,
            maxItemsHome:
              values.maxItemsHome === '' ? null : Number(values.maxItemsHome),
          })
        : createWorkType({
            code: values.code,
            label: values.label,
            pluralLabel: values.pluralLabel,
            maxItemsHome:
              values.maxItemsHome === '' ? null : Number(values.maxItemsHome),
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.workTypes.all })
      toast.success(esEdicion ? 'Tipo actualizado.' : 'Tipo creado.')
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'WORK_TYPE_CODE_TAKEN') {
        form.setError('code', { type: 'server', message: error.message })
        return
      }
      if (applyApiFieldErrors(form, error)) return
      form.setError('root', {
        type: 'server',
        message:
          error instanceof ApiError ? error.message : 'It could not be saved.',
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? 'Edit work type' : 'New work type'}
          </DialogTitle>
          <DialogDescription>
            Every work you publish will be one of these types.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='work-type-form'
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(values)
            })}
            className='grid gap-4'
          >
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    {/* Inmutable tras crearlo: lo usan el filtro publico ?type= y el
                        mapeo a BibTeX, asi que cambiarlo romperia enlaces y citas. */}
                    <Input
                      placeholder='journal_article'
                      disabled={esEdicion}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {esEdicion
                      ? 'It cannot be changed: it appears in the links you have already shared.'
                      : 'It is used in web addresses. You will not be able to change it later.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag</FormLabel>
                  <FormControl>
                    <Input placeholder='Journal Article' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='pluralLabel'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plural label</FormLabel>
                  <FormControl>
                    <Input placeholder='Journal Articles' {...field} />
                  </FormControl>
                  <FormDescription>
                    Used when several are grouped, for example &quot;3
                    articles&quot;.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='maxItemsHome'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many on the home page</FormLabel>
                  <FormControl>
                    <Input
                      inputMode='numeric'
                      placeholder='No limit'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    How many works of this type appear on the home page. Empty:
                    as many as fit.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          <Button
            type='submit'
            form='work-type-form'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
