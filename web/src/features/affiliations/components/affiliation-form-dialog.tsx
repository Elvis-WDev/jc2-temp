import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import { conValorActual, useCatalogTerms } from '@/hooks/use-catalog-terms'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { MarkdownEditor } from '@/components/markdown-editor'
import { listDepartments, listInstitutions } from '@/features/institutions/api'
import { createAffiliation, updateAffiliation, type Affiliation } from '../api'

/** Marca de "sin departamento": un Select no admite una opción de valor vacío. */
const SIN_DEPARTAMENTO = 'ninguno'

const formSchema = z
  .object({
    institutionId: z.uuid('Choose an institution.'),
    departmentId: z.string(),
    title: z.string().trim().min(1, 'Required.').max(250),
    affiliationType: z.string().trim().max(50),
    startDate: z.string(),
    endDate: z.string(),
    isPrimary: z.boolean(),
    isCurrent: z.boolean(),
    descriptionMarkdown: z.string().max(20000),
  })
  .refine(
    (valores) =>
      valores.startDate === '' ||
      valores.endDate === '' ||
      valores.startDate <= valores.endDate,
    { path: ['endDate'], message: 'It is earlier than the start date.' }
  )

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  affiliation?: Affiliation
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

export function AffiliationFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, personId, affiliation }: Omit<Props, 'open'>) {
  const esEdicion = affiliation !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      institutionId: affiliation?.institutionId ?? '',
      departmentId: affiliation?.departmentId ?? SIN_DEPARTAMENTO,
      title: affiliation?.title ?? '',
      affiliationType: affiliation?.affiliationType ?? '',
      startDate: affiliation?.startDate ?? '',
      endDate: affiliation?.endDate ?? '',
      isPrimary: affiliation?.isPrimary ?? false,
      isCurrent: affiliation?.isCurrent ?? true,
      descriptionMarkdown: affiliation?.descriptionMarkdown ?? '',
    },
  })

  // `useWatch` en vez de `form.watch()`: el segundo devuelve una funcion nueva en cada
  // render y hace que el compilador renuncie a memoizar todo el componente.
  const institucionElegida = useWatch({
    control: form.control,
    name: 'institutionId',
  })
  const { terminos: tiposDeVinculo } = useCatalogTerms('affiliation')

  const { data: instituciones } = useQuery({
    queryKey: queryKeys.institutions.list({ page_size: 100 }),
    queryFn: () => listInstitutions({ page: 1, page_size: 100 }),
  })

  // Solo los departamentos de la institución elegida. Así RN-006 no se puede ni
  // intentar desde el panel: no hay forma de seleccionar uno de otra institución.
  const { data: departamentos } = useQuery({
    queryKey: queryKeys.departments.list(institucionElegida),
    queryFn: () => listDepartments(institucionElegida),
    enabled: institucionElegida !== '',
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        personId,
        institutionId: values.institutionId,
        departmentId:
          values.departmentId === SIN_DEPARTAMENTO ? null : values.departmentId,
        title: values.title,
        affiliationType: vacioANull(values.affiliationType),
        startDate: vacioANull(values.startDate),
        endDate: vacioANull(values.endDate),
        isPrimary: values.isPrimary,
        isCurrent: values.isCurrent,
        descriptionMarkdown: vacioANull(values.descriptionMarkdown),
      }
      return esEdicion
        ? updateAffiliation(affiliation.id, payload)
        : createAffiliation(payload)
    },
    invalidates: [queryKeys.affiliations.all],
    success: esEdicion ? 'Afiliacion actualizada.' : 'Afiliacion creada.',
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
        className='grid gap-4 sm:grid-cols-2'
      >
        <DialogHeader className='sm:col-span-2'>
          <DialogTitle>
            {esEdicion ? 'Edit affiliation' : 'New affiliation'}
          </DialogTitle>
          <DialogDescription>
            Where you work or have worked, and in what role.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='institutionId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Institution</FormLabel>
              <Select
                value={field.value}
                onValueChange={(valor) => {
                  field.onChange(valor)
                  // Al cambiar de institucion, el departamento anterior ya no es
                  // valido: dejarlo puesto seria enviar una combinacion imposible.
                  form.setValue('departmentId', SIN_DEPARTAMENTO)
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Choose an institution' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(instituciones?.items ?? []).map((institucion) => (
                    <SelectItem key={institucion.id} value={institucion.id}>
                      {institucion.name}
                      {!institucion.isActive && ' (oculta)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='departmentId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={institucionElegida === ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        institucionElegida === ''
                          ? 'Choose the institution first'
                          : 'No department'
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SIN_DEPARTAMENTO}>
                    No department
                  </SelectItem>
                  {(departamentos ?? []).map((departamento) => (
                    <SelectItem key={departamento.id} value={departamento.id}>
                      {departamento.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>Optional.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Input placeholder='Associate Professor' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='affiliationType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of appointment</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Not specified' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {conValorActual(tiposDeVinculo, field.value).map((tipo) => (
                    <SelectItem key={tipo.code} value={tipo.code}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>You manage them in Catalogues.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='startDate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>From</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='endDate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormDescription>
                Leave it empty if you are still there.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isCurrent'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='es-actual'>Current</Label>
                <p className='text-xs text-muted-foreground'>
                  {field.value
                    ? 'It appears as a current position.'
                    : 'It appears as past.'}
                </p>
              </div>
              <FormControl>
                <Switch
                  id='es-actual'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isPrimary'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='es-principal'>Primary</Label>
                <p className='text-xs text-muted-foreground'>
                  {field.value
                    ? 'This is the one shown on your public profile.'
                    : 'It is not highlighted on the public profile.'}
                </p>
              </div>
              <FormControl>
                <Switch
                  id='es-principal'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='descriptionMarkdown'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <MarkdownEditor rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className='sm:col-span-2'>
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
            {esEdicion ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
