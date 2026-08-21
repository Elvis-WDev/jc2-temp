import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { MarkdownEditor } from '@/components/markdown-editor'
import {
  createDepartment,
  listInstitutions,
  updateDepartment,
  type Department,
} from '@/features/institutions/api'

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const formSchema = z.object({
  institutionId: z.uuid('Choose an institution.'),
  name: z.string().trim().min(1, 'Required.').max(250),
  shortName: z.string().trim().max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(1, 'Required.')
    .max(180)
    .regex(SLUG, 'Lowercase words separated by hyphens.'),
  websiteUrl: z.url('Invalid URL.').or(z.literal('')).optional(),
  descriptionMarkdown: z.string().max(20000),
})

type FormValues = z.infer<typeof formSchema>

function sugerirSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department
  /** Institución preseleccionada al crear, cuando la tabla ya está filtrada por una. */
  institutionId?: string
}

export function DepartmentFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        {/* Remontado en cada apertura: los valores iniciales salen del departamento
            elegido sin necesidad de sincronizarlos con un efecto. */}
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({
  onOpenChange,
  department,
  institutionId,
}: Omit<Props, 'open'>) {
  const esEdicion = department !== undefined

  // Se traen todas, incluidas las ocultas: si el departamento que se edita pertenece a
  // una institucion oculta, el selector tiene que poder mostrarla.
  const { data: instituciones, isLoading: cargandoInstituciones } = useQuery({
    queryKey: queryKeys.institutions.list({ page_size: 100 }),
    queryFn: () => listInstitutions({ page: 1, page_size: 100 }),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      institutionId: department?.institutionId ?? institutionId ?? '',
      name: department?.name ?? '',
      shortName: department?.shortName ?? '',
      slug: department?.slug ?? '',
      websiteUrl: department?.websiteUrl ?? '',
      descriptionMarkdown: department?.descriptionMarkdown ?? '',
    },
  })

  const vacioANull = (valor: string | undefined) =>
    valor === undefined || valor.trim() === '' ? null : valor.trim()

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        institutionId: values.institutionId,
        name: values.name,
        slug: values.slug,
        shortName: vacioANull(values.shortName),
        websiteUrl: vacioANull(values.websiteUrl),
        descriptionMarkdown: vacioANull(values.descriptionMarkdown),
      }
      return esEdicion
        ? updateDepartment(department.id, payload)
        : createDepartment(payload)
    },
    invalidates: [queryKeys.departments.all, queryKeys.institutions.all],
    success: esEdicion ? 'Department updated.' : 'Department created.',
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
            {esEdicion ? 'Edit department' : 'New department'}
          </DialogTitle>
          <DialogDescription>
            Faculties, schools and centres within an institution.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='institutionId'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Institution</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                // Al editar queda fijo: cambiarlo movería con él a todo el que esté
                // afiliado a este departamento. La API también lo rechaza.
                disabled={esEdicion || cargandoInstituciones}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        cargandoInstituciones
                          ? 'Loading...'
                          : 'Choose an institution'
                      }
                    />
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
              {esEdicion && (
                <FormDescription>
                  It cannot be changed: everyone affiliated with this department
                  would move with it. Create another department instead.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='School of Economics'
                  {...field}
                  onChange={(event) => {
                    field.onChange(event)
                    // Solo al crear: el identificador viaja en los enlaces publicos y
                    // cambiarlo despues rompe los que ya esten compartidos.
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
              <FormLabel>Acronym</FormLabel>
              <FormControl>
                <Input placeholder='SoE' {...field} />
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
                <Input placeholder='school-of-economics' {...field} />
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
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder='https://economics.unsw.edu.au' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='descriptionMarkdown'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <MarkdownEditor rows={3} {...field} />
              </FormControl>
              <FormDescription>Markdown works here. Optional.</FormDescription>
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
