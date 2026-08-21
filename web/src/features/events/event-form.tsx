import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Save, X } from 'lucide-react'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import { conValorActual, useCatalogTerms } from '@/hooks/use-catalog-terms'
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
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { MarkdownEditor } from '@/components/markdown-editor'
import { ImagePicker } from '@/components/media-picker'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import { listInstitutions } from '@/features/institutions/api'
import { createEvent, getEvent, updateEvent, type EventItem } from './api'

/**
 * Un evento se edita en página y no en modal: lleva contenido largo, una imagen y las
 * instituciones que lo organizan.
 */

const SIN_TIPO = 'ninguno'
const HEX = /^#[0-9a-fA-F]{6}$/

const formSchema = z
  .object({
    title: z.string().trim().min(1, 'Required.').max(300),
    eventType: z.string(),
    summary: z.string().max(5000),
    contentMarkdown: z.string().max(50000),
    // `datetime-local` entrega "AAAA-MM-DDTHH:MM", sin zona.
    startsAt: z.string().min(1, 'Required.'),
    endsAt: z.string(),
    location: z.string().trim().max(300),
    organizer: z.string().trim().max(300),
    imageAlt: z.string().max(500),
    buttonLabel: z.string().trim().max(100),
    buttonUrl: z.url('Invalid URL.').or(z.literal('')),
    buttonColor: z
      .string()
      .trim()
      .regex(HEX, 'Hex colour, like #1d4ed8.')
      .or(z.literal('')),
    isMain: z.boolean(),
  })
  .refine(
    (valores) => valores.endsAt === '' || valores.endsAt >= valores.startsAt,
    {
      path: ['endsAt'],
      message: 'It ends before it starts.',
    }
  )

type FormValues = z.infer<typeof formSchema>

type Props = { eventId?: string }

/** Instante ISO a lo que espera `datetime-local`, en hora local. */
function aLocal(iso: string | null): string {
  if (iso === null) return ''
  const fecha = new Date(iso)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${String(fecha.getFullYear())}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
}

export function EventForm({ eventId }: Props) {
  const esEdicion = eventId !== undefined

  const { data: evento, isLoading } = useQuery({
    queryKey: queryKeys.events.detail(eventId ?? ''),
    queryFn: () => getEvent(eventId as string),
    enabled: esEdicion,
  })

  if (esEdicion && isLoading) {
    return (
      <Main>
        <p className='text-muted-foreground'>Loading event...</p>
      </Main>
    )
  }

  return <Campos key={evento?.id ?? 'nuevo'} event={evento} />
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

function Campos({ event }: { event: EventItem | undefined }) {
  const navigate = useNavigate()
  const esEdicion = event !== undefined
  const { terminos } = useCatalogTerms('event')

  const [imageMediaId, setImageMediaId] = useState<string | null>(
    event?.imageMediaId ?? null
  )
  const [instituciones, setInstituciones] = useState<
    Array<{ id: string; name: string }>
  >(() => event?.institutions ?? [])

  const { data: todasLasInstituciones } = useQuery({
    queryKey: queryKeys.institutions.list({ page_size: 100 }),
    queryFn: () => listInstitutions({ page: 1, page_size: 100 }),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title ?? '',
      eventType: event?.eventType ?? SIN_TIPO,
      summary: event?.summary ?? '',
      contentMarkdown: event?.contentMarkdown ?? '',
      startsAt: aLocal(event?.startsAt ?? null),
      endsAt: aLocal(event?.endsAt ?? null),
      location: event?.location ?? '',
      organizer: event?.organizer ?? '',
      imageAlt: event?.imageAlt ?? '',
      buttonLabel: event?.buttonLabel ?? '',
      buttonUrl: event?.buttonUrl ?? '',
      buttonColor: event?.buttonColor ?? '',
      isMain: event?.isMain ?? false,
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        title: values.title,
        eventType: values.eventType === SIN_TIPO ? null : values.eventType,
        summary: vacioANull(values.summary),
        contentMarkdown: vacioANull(values.contentMarkdown),
        // El campo entrega hora local; la API guarda instantes en UTC.
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt:
          values.endsAt === '' ? null : new Date(values.endsAt).toISOString(),
        location: vacioANull(values.location),
        organizer: vacioANull(values.organizer),
        imageMediaId,
        imageAlt: vacioANull(values.imageAlt),
        buttonLabel: vacioANull(values.buttonLabel),
        buttonUrl: vacioANull(values.buttonUrl),
        buttonColor: vacioANull(values.buttonColor),
        isMain: values.isMain,
        institutionIds: instituciones.map((institucion) => institucion.id),
      }
      return esEdicion
        ? updateEvent(event.id, payload)
        : createEvent({ ...payload, slug: '' })
    },
    invalidates: [queryKeys.events.all],
    success: esEdicion ? 'Event saved.' : 'Event created.',
    onSuccess: (guardado) => {
      if (!esEdicion) {
        void navigate({
          to: '/admin/events/$eventId',
          params: { eventId: guardado.id },
        })
      }
    },
    onError: (error) => applyApiFieldErrors(form, error),
  })

  const disponibles = (todasLasInstituciones?.items ?? []).filter(
    (institucion) =>
      !instituciones.some((elegida) => elegida.id === institucion.id)
  )

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
              aria-label='Back to the event list'
              onClick={() => {
                void navigate({ to: '/admin/events' })
              }}
            >
              <ArrowLeft className='size-4' />
            </Button>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {esEdicion ? event.title : 'New event'}
              </h2>
              {esEdicion && (
                <p className='text-sm text-muted-foreground'>/{event.slug}</p>
              )}
            </div>
          </div>
          {esEdicion && event.editorialStatus === 'draft' && (
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
                <CardTitle>What and when</CardTitle>
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
                          placeholder='Behavioural Economics Seminar'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='eventType'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Not specified' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SIN_TIPO}>
                            Not specified
                          </SelectItem>
                          {conValorActual(
                            terminos,
                            field.value === SIN_TIPO ? '' : field.value
                          ).map((tipo) => (
                            <SelectItem key={tipo.code} value={tipo.code}>
                              {tipo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        You manage it in Catalogues.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='isMain'
                  render={({ field }) => (
                    <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
                      <div className='space-y-0.5'>
                        <Label htmlFor='evento-principal'>Featured</Label>
                        <p className='text-xs text-muted-foreground'>
                          {field.value
                            ? 'It comes first in the agenda.'
                            : 'It appears in its place by date.'}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          id='evento-principal'
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='startsAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starts</FormLabel>
                      <FormControl>
                        <Input type='datetime-local' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='endsAt'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ends</FormLabel>
                      <FormControl>
                        <Input type='datetime-local' {...field} />
                      </FormControl>
                      <FormDescription>
                        Empty if it has no fixed end.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='location'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Main Hall, or a video call link'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='organizer'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organised by</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Department of Economics'
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
                      <FormDescription>
                        What appears in the agenda.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* `organizer` es texto libre y estas son fichas de Institutions: lo
                    mismo dicho de dos maneras. Estaban en tarjetas distintas, a 900px
                    de scroll una de otra. */}
                <div className='grid gap-3 border-t pt-4 sm:col-span-2'>
                  <p className='text-sm font-medium'>Organising institutions</p>
                  {instituciones.length === 0 ? (
                    <p className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                      No institutions. Optional.
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {instituciones.map((institucion) => (
                        <span
                          key={institucion.id}
                          className='inline-flex items-center gap-1'
                        >
                          <StatusBadge tone='info' dot={false}>
                            {institucion.name}
                          </StatusBadge>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='size-6'
                            aria-label={`Remove ${institucion.name}`}
                            onClick={() => {
                              setInstituciones(
                                instituciones.filter(
                                  (actual) => actual.id !== institucion.id
                                )
                              )
                            }}
                          >
                            <X className='size-3' />
                          </Button>
                        </span>
                      ))}
                    </div>
                  )}

                  {disponibles.length > 0 && (
                    <Select
                      value=''
                      onValueChange={(id) => {
                        const elegida = disponibles.find(
                          (institucion) => institucion.id === id
                        )
                        if (elegida !== undefined) {
                          setInstituciones([
                            ...instituciones,
                            { id: elegida.id, name: elegida.name },
                          ])
                        }
                      }}
                    >
                      <SelectTrigger className='sm:max-w-sm'>
                        <SelectValue placeholder='Add an institution' />
                      </SelectTrigger>
                      <SelectContent>
                        {disponibles.map((institucion) => (
                          <SelectItem
                            key={institucion.id}
                            value={institucion.id}
                          >
                            {institucion.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <FormField
                  control={form.control}
                  name='contentMarkdown'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <MarkdownEditor rows={8} {...field} />
                      </FormControl>
                      <FormDescription>Markdown works here.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* La imagen es lo que se ve del evento, igual que el texto. */}
                <div className='border-t pt-4'>
                  <ImagePicker
                    value={imageMediaId}
                    onChange={setImageMediaId}
                  />
                  {imageMediaId !== null && (
                    <FormField
                      control={form.control}
                      name='imageAlt'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image description</FormLabel>
                          <FormControl>
                            <Input placeholder='Seminar poster' {...field} />
                          </FormControl>
                          <FormDescription>
                            Read by those who browse without seeing it.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Button</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-3'>
                <FormField
                  control={form.control}
                  name='buttonLabel'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <FormControl>
                        <Input placeholder='Register' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='buttonUrl'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination</FormLabel>
                      <FormControl>
                        <Input placeholder='https://...' {...field} />
                      </FormControl>
                      <FormDescription>
                        With no destination, the button does not appear.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='buttonColor'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colour</FormLabel>
                      <div className='flex gap-2'>
                        <FormControl>
                          <Input placeholder='#1d4ed8' {...field} />
                        </FormControl>
                        <input
                          type='color'
                          aria-label='Choose the button colour'
                          className='h-9 w-12 shrink-0 rounded-md border border-input bg-transparent'
                          value={
                            HEX.test(field.value) ? field.value : '#1d4ed8'
                          }
                          onChange={(evento) => {
                            field.onChange(evento.target.value)
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
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
                {esEdicion ? 'Save event' : 'Create event'}
              </Button>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
