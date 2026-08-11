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
import { createInstitution, updateInstitution, type Institution } from '../api'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const formSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(250),
  shortName: z.string().trim().max(100).optional(),
  slug: z
    .string()
    .trim()
    .min(1, 'Required.')
    .max(180)
    .regex(SLUG, 'Lowercase words separated by hyphens.'),
  city: z.string().trim().max(120).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2, 'Two letters, for example AU.')
    .or(z.literal(''))
    .optional(),
  websiteUrl: z.url('Invalid URL.').or(z.literal('')).optional(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Hex colour, like #1d4ed8.')
    .or(z.literal(''))
    .optional(),
})

type FormValues = z.infer<typeof formSchema>

/** Deriva un slug del nombre, como sugerencia editable. */
function sugerirSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  institution?: Institution
}

export function InstitutionFormDialog({
  open,
  onOpenChange,
  institution,
}: Props) {
  const queryClient = useQueryClient()
  const esEdicion = institution !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      shortName: '',
      slug: '',
      city: '',
      countryCode: '',
      websiteUrl: '',
      brandColor: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: institution?.name ?? '',
        shortName: institution?.shortName ?? '',
        slug: institution?.slug ?? '',
        city: institution?.city ?? '',
        countryCode: institution?.countryCode ?? '',
        websiteUrl: institution?.websiteUrl ?? '',
        brandColor: institution?.brandColor ?? '',
      })
    }
  }, [open, institution, form])

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const vacioANull = (valor: string | undefined) =>
        valor === undefined || valor === '' ? null : valor

      const payload = {
        name: values.name,
        slug: values.slug,
        shortName: vacioANull(values.shortName),
        city: vacioANull(values.city),
        countryCode: vacioANull(values.countryCode),
        websiteUrl: vacioANull(values.websiteUrl),
        brandColor: vacioANull(values.brandColor),
      }
      return esEdicion
        ? updateInstitution(institution.id, payload)
        : createInstitution(payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.institutions.all,
      })
      toast.success(esEdicion ? 'Institution updated.' : 'Institution created.')
      onOpenChange(false)
    },
    onError: (error) => {
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
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {esEdicion ? 'Edit institution' : 'New institution'}
          </DialogTitle>
          <DialogDescription>
            Universities and centres where you have taught or held a position.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='institution-form'
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(values)
            })}
            className='grid gap-4 sm:grid-cols-2'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem className='sm:col-span-2'>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='University of New South Wales'
                      {...field}
                      onChange={(event) => {
                        field.onChange(event)
                        // Solo al crear: cambiar el slug de una institucion existente
                        // rompe el filtro publico ?institution= que ya este en uso.
                        if (!esEdicion && !form.getFieldState('slug').isDirty) {
                          form.setValue('slug', sugerirSlug(event.target.value))
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
              name='shortName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short name</FormLabel>
                  <FormControl>
                    <Input placeholder='UNSW' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identifier</FormLabel>
                  <FormControl>
                    <Input placeholder='unsw' {...field} />
                  </FormControl>
                  <FormDescription>
                    It is used in web addresses. Leave the suggested one if you
                    have no preference.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='Sydney' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='countryCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country (ISO)</FormLabel>
                  <FormControl>
                    <Input placeholder='AU' maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='websiteUrl'
              render={({ field }) => (
                <FormItem className='sm:col-span-2'>
                  <FormLabel>Sitio web</FormLabel>
                  <FormControl>
                    <Input placeholder='https://unsw.edu.au' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='brandColor'
              render={({ field }) => (
                <FormItem className='sm:col-span-2'>
                  <FormLabel>Brand colour</FormLabel>
                  <div className='flex gap-2'>
                    <FormControl>
                      <Input placeholder='#1d4ed8' {...field} />
                    </FormControl>
                    <input
                      type='color'
                      aria-label='Choose the institution colour'
                      className='h-9 w-12 shrink-0 rounded-md border border-input bg-transparent'
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(field.value ?? '')
                          ? field.value
                          : '#1d4ed8'
                      }
                      onChange={(evento) => {
                        field.onChange(evento.target.value)
                      }}
                    />
                  </div>
                  <FormDescription>
                    To tell it apart on your site. Optional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p
                className='text-sm text-destructive sm:col-span-2'
                role='alert'
              >
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
            form='institution-form'
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
