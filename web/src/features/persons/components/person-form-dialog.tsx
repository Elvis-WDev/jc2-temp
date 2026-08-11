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
import { createPerson, updatePerson, type Person } from '../api'

const formSchema = z.object({
  fullName: z.string().trim().min(1, 'Write the full name.').max(200),
  givenName: z.string().trim().max(100),
  familyName: z.string().trim().max(100),
  orcid: z.string().trim().max(40),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  person?: Person
}

export function PersonFormDialog({ open, onOpenChange, person }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        {/* Se monta de nuevo en cada apertura, asi que los campos parten de los datos
            correctos sin tener que reiniciarlos a mano. */}
        <Campos
          onOpenChange={onOpenChange}
          {...(person === undefined ? {} : { person })}
        />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, person }: Omit<Props, 'open'>) {
  const esEdicion = person !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: person?.fullName ?? '',
      givenName: person?.givenName ?? '',
      familyName: person?.familyName ?? '',
      orcid: person?.orcid ?? '',
    },
  })

  const vacioANull = (valor: string) =>
    valor.trim() === '' ? null : valor.trim()

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        fullName: values.fullName,
        givenName: vacioANull(values.givenName),
        familyName: vacioANull(values.familyName),
        orcid: vacioANull(values.orcid),
      }
      return esEdicion
        ? updatePerson(person.id, payload)
        : createPerson(payload)
    },
    invalidates: [queryKeys.persons.all],
    success: esEdicion ? 'Author updated.' : 'Author added.',
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (error) => {
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
    <>
      <DialogHeader>
        <DialogTitle>{esEdicion ? 'Edit author' : 'New author'}</DialogTitle>
        <DialogDescription>
          Authors are shared across all your work.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          id='person-form'
          onSubmit={form.handleSubmit((values) => {
            guardar.mutate(values)
          })}
          className='grid gap-4'
        >
          <FormField
            control={form.control}
            name='fullName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder='Juan Carlos Carbajal' {...field} />
                </FormControl>
                <FormDescription>
                  This is the one that appears on the site.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='givenName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Juan Carlos' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='familyName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl>
                    <Input placeholder='Carbajal' {...field} />
                  </FormControl>
                  <FormDescription>It is used for citations.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='orcid'
            render={({ field }) => (
              <FormItem>
                <FormLabel>ORCID</FormLabel>
                <FormControl>
                  <Input placeholder='0000-0002-1825-0097' {...field} />
                </FormControl>
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
        <Button type='submit' form='person-form' disabled={guardar.isPending}>
          {guardar.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  )
}
