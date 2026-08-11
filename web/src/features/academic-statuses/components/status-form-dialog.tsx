import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import {
  createAcademicStatus,
  NOMBRE_DE_TONO,
  TONOS,
  updateAcademicStatus,
  type AcademicStatus,
} from '../api'

const CODIGO = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

const formSchema = z.object({
  label: z.string().trim().min(1, 'Required.').max(100),
  code: z
    .string()
    .trim()
    .min(2, 'At least two characters.')
    .max(50)
    .regex(CODIGO, 'Lowercase words separated by underscores.'),
  tone: z.enum(TONOS),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  status?: AcademicStatus
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

export function StatusFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, status }: Omit<Props, 'open'>) {
  const esEdicion = status !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: status?.label ?? '',
      code: status?.code ?? '',
      tone: status?.tone ?? 'neutral',
    },
  })

  // `useWatch` y no `form.watch()`: el segundo devuelve una funcion nueva en cada
  // render y hace que el compilador renuncie a memoizar el componente entero.
  const tonoElegido = useWatch({ control: form.control, name: 'tone' })
  const nombreEscrito = useWatch({ control: form.control, name: 'label' })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) =>
      esEdicion
        ? updateAcademicStatus(status.id, {
            label: values.label,
            tone: values.tone,
          })
        : createAcademicStatus(values),
    invalidates: [queryKeys.academicStatuses.all, queryKeys.works.all],
    success: esEdicion ? 'Status updated.' : 'Status created.',
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
          <DialogTitle>{esEdicion ? 'Edit status' : 'New status'}</DialogTitle>
          <DialogDescription>
            How far along a work is. It does not decide whether it appears on
            the site.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='label'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='En segunda revision'
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    if (!esEdicion && !form.getFieldState('code').isDirty) {
                      form.setValue('code', sugerirCodigo(event.target.value))
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
                  placeholder='second_review'
                  disabled={esEdicion}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {esEdicion
                  ? 'It cannot be changed: it appears in the addresses of your site and in the work that already uses it.'
                  : 'It appears in the addresses of your site. Only you see it here.'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='tone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Colour</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TONOS.map((tono) => (
                    <SelectItem key={tono} value={tono}>
                      <span className='flex items-center gap-2'>
                        <StatusBadge tone={tono}>
                          {NOMBRE_DE_TONO[tono]}
                        </StatusBadge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The colour it is drawn with in tables.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-1'>
          <span className='text-sm font-medium'>This is how it will look</span>
          <span>
            <StatusBadge tone={tonoElegido}>
              {nombreEscrito === '' ? 'Sin nombre' : nombreEscrito}
            </StatusBadge>
          </span>
        </div>

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
