import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  TagsSection,
  type TagDraft,
} from '@/features/works/components/tags-section'
import { createCourse, getCourse, updateCourse, type Course } from './api'
import { OfferingsSection } from './components/offerings-section'

/**
 * Un curso se edita en su propia página, no en un modal, porque lleva colecciones
 * dentro: sus ediciones y, dentro de cada una, sus materiales. En una ventana flotante
 * habría que hacer scroll dentro del scroll y abrir un modal encima de otro.
 */

const formSchema = z.object({
  title: z.string().trim().min(1, 'Required.').max(300),
  shortTitle: z.string().trim().max(160),
  slug: z.string().trim().max(220),
  defaultCode: z.string().trim().max(80),
  level: z.string().trim().max(80),
  summary: z.string().max(5000),
  descriptionMarkdown: z.string().max(50000),
  externalUrl: z.url('Invalid URL.').or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

type Props = { courseId?: string }

export function CourseForm({ courseId }: Props) {
  const esEdicion = courseId !== undefined

  const { data: curso, isLoading } = useQuery({
    queryKey: queryKeys.courses.detail(courseId ?? ''),
    queryFn: () => getCourse(courseId as string),
    enabled: esEdicion,
  })

  if (esEdicion && isLoading) {
    return (
      <Main>
        <p className='text-muted-foreground'>Loading course...</p>
      </Main>
    )
  }

  // `key` remonta el formulario al navegar de un curso a otro sin desmontar.
  return <Campos key={curso?.id ?? 'nuevo'} course={curso} />
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

function Campos({ course }: { course: Course | undefined }) {
  const navigate = useNavigate()
  const esEdicion = course !== undefined

  const [etiquetas, setEtiquetas] = useState<TagDraft[]>(
    () => course?.tags.map((tag) => ({ id: tag.id, name: tag.name })) ?? []
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: course?.title ?? '',
      shortTitle: course?.shortTitle ?? '',
      slug: course?.slug ?? '',
      defaultCode: course?.defaultCode ?? '',
      level: course?.level ?? '',
      summary: course?.summary ?? '',
      descriptionMarkdown: course?.descriptionMarkdown ?? '',
      externalUrl: course?.externalUrl ?? '',
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        title: values.title,
        shortTitle: vacioANull(values.shortTitle),
        defaultCode: vacioANull(values.defaultCode),
        level: vacioANull(values.level),
        summary: vacioANull(values.summary),
        descriptionMarkdown: vacioANull(values.descriptionMarkdown),
        externalUrl: vacioANull(values.externalUrl),
        tagIds: etiquetas.map((tag) => tag.id),
      }
      return esEdicion
        ? updateCourse(course.id, payload)
        : // El identificador lo deriva el servidor del titulo; al editar no se toca,
          // porque viaja en la direccion publica del curso.
          createCourse({ ...payload, slug: '' })
    },
    invalidates: [queryKeys.courses.all, queryKeys.dashboard],
    success: esEdicion ? 'Course saved.' : 'Course created.',
    onSuccess: (guardado) => {
      if (!esEdicion) {
        void navigate({
          to: '/admin/courses/$courseId',
          params: { courseId: guardado.id },
        })
      }
    },
    onError: (error) => applyApiFieldErrors(form, error),
  })

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
              aria-label='Back to the course list'
              onClick={() => {
                void navigate({ to: '/admin/courses' })
              }}
            >
              <ArrowLeft className='size-4' />
            </Button>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {esEdicion ? course.title : 'New course'}
              </h2>
              {esEdicion && (
                <p className='text-sm text-muted-foreground'>/{course.slug}</p>
              )}
            </div>
          </div>
          {esEdicion && course.editorialStatus === 'draft' && (
            <StatusBadge tone='warning'>
              Draft: not visible on the site yet
            </StatusBadge>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              guardar.mutate(values)
            })}
            className='grid gap-4 sm:gap-6'
          >
            <Card>
              <CardHeader>
                <CardTitle>Course details</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Microeconomia Intermedia'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='shortTitle'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short title</FormLabel>
                      <FormControl>
                        <Input placeholder='Micro Intermedia' {...field} />
                      </FormControl>
                      <FormDescription>For narrow listings.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='defaultCode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usual code</FormLabel>
                      <FormControl>
                        <Input placeholder='ECON2101' {...field} />
                      </FormControl>
                      <FormDescription>
                        Each offering can have its own.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='level'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Undergraduate, master's, doctoral..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='externalUrl'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Official page</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='https://uni.edu/cursos/eco101'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The course on the site of the institution, if it has
                        one.
                      </FormDescription>
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
                      <FormDescription>
                        This is what appears in the listing.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name='descriptionMarkdown'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={8} {...field} />
                      </FormControl>
                      <FormDescription>Admite Markdown.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6'>
                <TagsSection
                  value={etiquetas}
                  onChange={setEtiquetas}
                  description='They let visitors filter your courses by topic.'
                />
              </CardContent>
            </Card>

            <div className='sticky bottom-0 flex justify-end border-t bg-background py-4'>
              <Button type='submit' disabled={guardar.isPending}>
                {guardar.isPending ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <Save />
                )}
                {esEdicion ? 'Save course' : 'Create course'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Las ediciones se guardan por su cuenta, no con el formulario del curso: cada
            una es un registro propio con su publicacion y sus materiales. Por eso van
            fuera del <form>, para que su boton no lo envie sin querer. */}
        {esEdicion ? (
          <Card>
            <CardContent className='pt-6'>
              <OfferingsSection course={course} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className='pt-6 text-sm text-muted-foreground'>
              Create the course before adding offerings to it.
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
