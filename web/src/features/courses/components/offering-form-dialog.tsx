import { useState } from 'react'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { listDepartments, listInstitutions } from '@/features/institutions/api'
import { createOffering, updateOffering, type CourseOffering } from '../api'
import { TeachersSection, type TeacherDraft } from './teachers-section'

const SIN_DEPARTAMENTO = 'ninguno'

const AHORA = new Date().getFullYear()

const formSchema = z
  .object({
    institutionId: z.uuid('Choose an institution.'),
    departmentId: z.string(),
    name: z.string().trim().max(250),
    courseCode: z.string().trim().max(80),
    term: z.string().trim().max(100),
    // Texto y no numero: `z.coerce.number()` con un campo vacio da NaN y rompe el
    // resolver antes de poder mostrar un mensaje util.
    academicYear: z
      .string()
      .refine(
        (valor) =>
          valor === '' ||
          (/^\d{4}$/.test(valor) &&
            Number(valor) >= 1800 &&
            Number(valor) <= 2200),
        'Write a four-digit year.'
      ),
    startDate: z.string(),
    endDate: z.string(),
    teachingRole: z.string().trim().max(120),
    summary: z.string().max(5000),
    contentMarkdown: z.string().max(50000),
    isActive: z.boolean(),
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
  courseId: string
  offering?: CourseOffering
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

export function OfferingFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, courseId, offering }: Omit<Props, 'open'>) {
  const esEdicion = offering !== undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      institutionId: offering?.institutionId ?? '',
      departmentId: offering?.departmentId ?? SIN_DEPARTAMENTO,
      name: offering?.name ?? '',
      courseCode: offering?.courseCode ?? '',
      term: offering?.term ?? '',
      academicYear:
        offering?.academicYear === null || offering?.academicYear === undefined
          ? String(AHORA)
          : String(offering.academicYear),
      startDate: offering?.startDate ?? '',
      endDate: offering?.endDate ?? '',
      teachingRole: offering?.teachingRole ?? '',
      summary: offering?.summary ?? '',
      contentMarkdown: offering?.contentMarkdown ?? '',
      isActive: offering?.isActive ?? true,
    },
  })

  const institucionElegida = useWatch({
    control: form.control,
    name: 'institutionId',
  })

  // Fuera del formulario: es una lista de registros, no un campo de texto.
  const [docentes, setDocentes] = useState<TeacherDraft[]>(
    () =>
      offering?.teachers.map((docente) => ({
        personId: docente.personId,
        fullName: docente.fullName,
        role: docente.role ?? '',
      })) ?? []
  )

  const { data: instituciones } = useQuery({
    queryKey: queryKeys.institutions.list({ page_size: 100 }),
    queryFn: () => listInstitutions({ page: 1, page_size: 100 }),
  })

  // Solo los departamentos de la institución elegida: así no hay forma de componer
  // desde el panel la combinación que la API rechaza con 422.
  const { data: departamentos } = useQuery({
    queryKey: queryKeys.departments.list(institucionElegida),
    queryFn: () => listDepartments(institucionElegida),
    enabled: institucionElegida !== '',
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const comun = {
        institutionId: values.institutionId,
        departmentId:
          values.departmentId === SIN_DEPARTAMENTO ? null : values.departmentId,
        name: vacioANull(values.name),
        courseCode: vacioANull(values.courseCode),
        term: vacioANull(values.term),
        academicYear:
          values.academicYear === '' ? null : Number(values.academicYear),
        startDate: vacioANull(values.startDate),
        endDate: vacioANull(values.endDate),
        teachingRole: vacioANull(values.teachingRole),
        summary: vacioANull(values.summary),
        contentMarkdown: vacioANull(values.contentMarkdown),
        isActive: values.isActive,
        teachers: docentes.map((docente, indice) => ({
          personId: docente.personId,
          role: docente.role.trim() === '' ? null : docente.role.trim(),
          sortOrder: indice,
        })),
      }
      return esEdicion
        ? updateOffering(offering.id, comun)
        : createOffering({ courseId, ...comun })
    },
    invalidates: [queryKeys.courses.all],
    success: esEdicion ? 'Offering updated.' : 'Offering created.',
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
            {esEdicion ? 'Edit offering' : 'New offering'}
          </DialogTitle>
          <DialogDescription>
            One time you taught the course: where, when and with what material.
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
              <FormDescription>Opcional.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='term'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Term</FormLabel>
              <FormControl>
                <Input placeholder='Semestre 1, Term 2, Otono...' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='academicYear'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic year</FormLabel>
              <FormControl>
                <Input
                  inputMode='numeric'
                  placeholder={String(AHORA)}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='startDate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starts</FormLabel>
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
              <FormLabel>Ends</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='courseCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder='ECON2101' {...field} />
              </FormControl>
              <FormDescription>
                If it has its own code at that institution.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='teachingRole'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your role</FormLabel>
              <FormControl>
                <Input
                  placeholder='Responsable, co-docente, ayudante...'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Offering name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Only if it differs from the course title'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='summary'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='contentMarkdown'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea rows={5} {...field} />
              </FormControl>
              <FormDescription>Admite Markdown.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isActive'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2 sm:col-span-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='edicion-activa'>Running</Label>
                <p className='text-xs text-muted-foreground'>
                  {field.value
                    ? 'It is shown as the current offering of the course.'
                    : 'It is shown as a past offering.'}
                </p>
              </div>
              <FormControl>
                <Switch
                  id='edicion-activa'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className='sm:col-span-2'>
          <TeachersSection value={docentes} onChange={setDocentes} />
        </div>

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
            {esEdicion ? 'Save' : 'Crear'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
