import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/api-error'
import { applyApiFieldErrors } from '@/lib/api/form-errors'
import { queryKeys } from '@/lib/api/query-keys'
import {
  conEstadoActual,
  useAcademicStatuses,
} from '@/hooks/use-academic-statuses'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { CollapsibleCard } from '@/components/collapsible-card'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { MarkdownEditor } from '@/components/markdown-editor'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { listWorkTypes } from '@/features/work-types/api'
import { createWork, getWork, updateWork, type Work } from './api'
import { AuthorsSection, type AuthorDraft } from './components/authors-section'
import { CitationsSection } from './components/citations-section'
import { FilesSection, type FileDraft } from './components/files-section'
import { LinksSection, type LinkDraft } from './components/links-section'
import { TagsSection, type TagDraft } from './components/tags-section'
import { VenueSection, type VenueDraft } from './components/venue-section'

/**
 * Formulario de trabajo (ERS §33).
 *
 * Es una **pagina completa, no un modal**: tiene secciones, listas ordenables y ciclo
 * de vida borrador/publicado, que es justo el caso en el que
 * `forms-and-workflows.md:5-16` descarta el modal.
 *
 * El DOI se envia tal cual se escriba: el backend lo normaliza (RN-009), asi que no
 * hay que pedirle al usuario un formato concreto.
 */
const formSchema = z.object({
  workTypeId: z.uuid('Select a type.'),
  title: z.string().trim().min(1, 'The title is required.').max(1000),
  subtitle: z.string().trim().max(1000).optional(),
  academicStatus: z.string().min(1, 'Choose a status.'),
  // Se valida como texto y se convierte al enviar: una union con z.coerce.number()
  // hace que el tipo de entrada y el de salida difieran, y el resolver deja de
  // encajar con el tipo del formulario.
  // Orden manual dentro de su tipo en Research. Texto por lo mismo que el ano: un
  // `z.coerce.number()` haria que el tipo de entrada y el de salida difieran.
  displayOrder: z
    .string()
    .trim()
    .refine((valor) => valor === '' || /^\d{1,4}$/.test(valor), {
      message: 'A whole number, or leave it empty.',
    }),
  publicationYear: z
    .string()
    .trim()
    .refine(
      (valor) =>
        valor === '' ||
        (/^\d{4}$/.test(valor) &&
          Number(valor) >= 1800 &&
          Number(valor) <= 2200),
      'Enter a year between 1800 and 2200.'
    ),
  publisherName: z.string().trim().max(300).optional(),
  volume: z.string().trim().max(50).optional(),
  issue: z.string().trim().max(50).optional(),
  pages: z.string().trim().max(50).optional(),
  doi: z.string().trim().max(255).optional(),
  isbn: z.string().trim().max(50).optional(),
  issn: z.string().trim().max(50).optional(),
  abstractMarkdown: z.string().max(50000).optional(),
  isOpenAccess: z.boolean(),
  citationTextOverride: z.string().max(5000).optional(),
  versionLabel: z.string().trim().max(50),
  downloadCode: z.string().trim().max(100),
  bibtexOverride: z.string().max(10000).optional(),
})

type FormValues = z.infer<typeof formSchema>

const VACIOS: FormValues = {
  workTypeId: '',
  title: '',
  subtitle: '',
  academicStatus: 'working_paper',
  displayOrder: '',
  publicationYear: '',
  publisherName: '',
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  isbn: '',
  issn: '',
  abstractMarkdown: '',
  isOpenAccess: false,
  citationTextOverride: '',
  versionLabel: '',
  downloadCode: '',
  bibtexOverride: '',
}

const nullSiVacio = (valor: string | undefined) =>
  valor === undefined || valor.trim() === '' ? null : valor.trim()

/** Convierte el trabajo cargado en los valores iniciales del formulario. */
function aValores(work: Work | undefined): FormValues {
  if (work === undefined) return VACIOS

  return {
    workTypeId: work.workTypeId,
    title: work.title,
    subtitle: work.subtitle ?? '',
    academicStatus: work.academicStatus,
    displayOrder: work.displayOrder === null ? '' : String(work.displayOrder),
    publicationYear:
      work.publicationYear === null ? '' : String(work.publicationYear),
    publisherName: work.publisherName ?? '',
    volume: work.volume ?? '',
    issue: work.issue ?? '',
    pages: work.pages ?? '',
    doi: work.doi ?? '',
    isbn: work.isbn ?? '',
    issn: work.issn ?? '',
    abstractMarkdown: work.abstractMarkdown ?? '',
    isOpenAccess: work.isOpenAccess,
    citationTextOverride: work.citationTextOverride ?? '',
    versionLabel: work.versionLabel ?? '',
    downloadCode: work.downloadCode ?? '',
    bibtexOverride: work.bibtexOverride ?? '',
  }
}

type Props = { workId?: string }

/**
 * Contenedor: resuelve la carga antes de montar el formulario.
 *
 * Asi los valores iniciales se pasan por props y no hace falta sincronizarlos con un
 * efecto, que ademas provocaria un render con el formulario vacio antes de rellenarlo.
 */
/** Lo que vive dentro de «More options»: si algo de aqui falla, hay que abrirlo. */
const CAMPOS_PLEGADOS = [
  'versionLabel',
  'downloadCode',
  'displayOrder',
  'citationTextOverride',
  'bibtexOverride',
] as const

export function WorkForm({ workId }: Props) {
  const esEdicion = workId !== undefined

  const { data: work, isLoading } = useQuery({
    queryKey: queryKeys.works.detail(workId ?? ''),
    queryFn: () => getWork(workId as string),
    enabled: esEdicion,
  })

  if (esEdicion && isLoading) {
    return (
      <Main>
        <p className='text-muted-foreground'>Loading work...</p>
      </Main>
    )
  }

  // `key` remonta el formulario si se navega de un trabajo a otro sin desmontar.
  return <WorkFormFields key={work?.id ?? 'nuevo'} work={work} />
}

function WorkFormFields({ work }: { work: Work | undefined }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const esEdicion = work !== undefined
  const workId = work?.id

  const [autores, setAutores] = useState<AuthorDraft[]>(
    () =>
      work?.authors.map((autor) => ({
        personId: autor.personId,
        fullName: autor.fullName,
        contributionRole: autor.contributionRole,
        isCorresponding: autor.isCorresponding,
      })) ?? []
  )

  const [etiquetas, setEtiquetas] = useState<TagDraft[]>(
    () => work?.tags.map((tag) => ({ id: tag.id, name: tag.name })) ?? []
  )

  const [enlaces, setEnlaces] = useState<LinkDraft[]>(
    () =>
      work?.links.map((link) => ({
        linkType: link.linkType,
        label: link.label ?? '',
        url: link.url,
        isPublic: link.isPublic,
      })) ?? []
  )

  const [archivos, setArchivos] = useState<FileDraft[]>(
    () =>
      work?.files.map((archivo) => ({
        mediaId: archivo.mediaId,
        // El listado del trabajo no trae el nombre original del archivo; se muestra
        // su funcion hasta que se recargue desde el gestor de archivos.
        filename: archivo.label ?? archivo.fileType,
        fileType: archivo.fileType,
        isPublic: archivo.isPublic,
      })) ?? []
  )

  const { estados } = useAcademicStatuses(true)

  const [venue, setVenue] = useState<VenueDraft>(() => ({
    venueId: work?.venueId ?? null,
    venueName:
      work?.venueId === null || work === undefined
        ? (work?.venueName ?? '')
        : '',
  }))

  const { data: tipos } = useQuery({
    queryKey: queryKeys.workTypes.list(),
    queryFn: () => listWorkTypes(true),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: aValores(work),
  })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        workTypeId: values.workTypeId,
        title: values.title,
        subtitle: nullSiVacio(values.subtitle),
        academicStatus: values.academicStatus,
        displayOrder:
          values.displayOrder === '' ? null : Number(values.displayOrder),
        publicationYear:
          values.publicationYear === '' ? null : Number(values.publicationYear),
        // Una cosa o la otra, nunca las dos: la API lo rechazaria con 422.
        venueId: venue.venueId,
        venueName: venue.venueId === null ? nullSiVacio(venue.venueName) : null,
        publisherName: nullSiVacio(values.publisherName),
        volume: nullSiVacio(values.volume),
        issue: nullSiVacio(values.issue),
        pages: nullSiVacio(values.pages),
        doi: nullSiVacio(values.doi),
        isbn: nullSiVacio(values.isbn),
        issn: nullSiVacio(values.issn),
        abstractMarkdown: nullSiVacio(values.abstractMarkdown),
        isOpenAccess: values.isOpenAccess,
        citationTextOverride: nullSiVacio(values.citationTextOverride),
        versionLabel: nullSiVacio(values.versionLabel),
        downloadCode: nullSiVacio(values.downloadCode),
        bibtexOverride: nullSiVacio(values.bibtexOverride),
        // El orden se deriva de la posicion en la lista: garantiza la secuencia 1..N
        // sin huecos que exige el backend, sin que el usuario tenga que teclearla.
        authors: autores.map((autor, indice) => ({
          personId: autor.personId,
          authorOrder: indice + 1,
          contributionRole: autor.contributionRole,
          isCorresponding: autor.isCorresponding,
        })),
        tagIds: etiquetas.map((tag) => tag.id),
        // Se descartan los enlaces sin direccion: una fila vacia recien anadida no
        // deberia impedir guardar el resto.
        links: enlaces
          .filter((link) => link.url.trim() !== '')
          .map((link, indice) => ({
            linkType: link.linkType,
            label: link.label.trim() === '' ? null : link.label,
            url: link.url.trim(),
            sortOrder: indice,
            isPublic: link.isPublic,
          })),
        files: archivos.map((archivo, indice) => ({
          mediaId: archivo.mediaId,
          fileType: archivo.fileType,
          sortOrder: indice,
          isPublic: archivo.isPublic,
        })),
      }

      return esEdicion && workId !== undefined
        ? updateWork(workId, payload)
        : createWork({ ...payload, slug: '' })
    },
    onSuccess: async (guardado) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.works.all })
      toast.success(esEdicion ? 'Work saved.' : 'Work created as a draft.')
      if (!esEdicion) {
        void navigate({
          to: '/admin/works/$workId',
          params: { workId: guardado.id },
          replace: true,
        })
      }
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
    <>
      <Header fixed>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => {
            void navigate({ to: '/admin/works' })
          }}
        >
          <ArrowLeft /> Work
        </Button>
        <div className='ms-auto flex items-center gap-2'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            {esEdicion ? 'Edit work' : 'New work'}
          </h2>
          <p className='text-muted-foreground'>
            It is saved as a draft: it will not appear on your site until you
            publish it.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => {
              mutation.mutate(values)
            })}
            className='grid gap-6'
          >
            <Card>
              <CardHeader>
                <CardTitle>Basic details</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='subtitle'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='workTypeId'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select a type' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(tipos ?? []).map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.label}
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
                  name='publicationYear'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication year</FormLabel>
                      <FormControl>
                        <Input type='number' placeholder='2024' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='academicStatus'
                  render={({ field }) => (
                    <FormItem className='sm:col-span-2'>
                      <FormLabel>Academic status</FormLabel>
                      <div className='grid gap-1 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-3'>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {conEstadoActual(estados, field.value).map(
                              (estado) => (
                                <SelectItem
                                  key={estado.code}
                                  value={estado.code}
                                >
                                  {estado.label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        {/* ERS RF-004: no es lo mismo que el estado de publicacion en
                            el sitio, y confundirlos es el error clasico. Va al lado y
                            no debajo porque en una columna estrecha se partia en
                            cuatro lineas. */}
                        <FormDescription className='!mt-0'>
                          Not whether it appears on your site.
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Los autores son parte de lo basico de una publicacion, no material
                    adjunto: van con el titulo y el ano, separados por una linea. */}
                <div className='border-t pt-4 sm:col-span-2'>
                  <AuthorsSection value={autores} onChange={setAutores} />
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
                  name='abstractMarkdown'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abstract</FormLabel>
                      <FormControl>
                        <MarkdownEditor rows={6} {...field} />
                      </FormControl>
                      <FormDescription>Markdown works here.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Las etiquetas dicen de que trata, igual que el resumen. */}
                <div className='border-t pt-4'>
                  <TagsSection value={etiquetas} onChange={setEtiquetas} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Where it was published</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <VenueSection
                  value={venue}
                  onChange={setVenue}
                  {...(work?.venueName === undefined
                    ? {}
                    : { nombreFicha: work.venueName })}
                />

                {/* Seis campos cortos —un numero de volumen, un ISBN— en tres columnas
                    y no en dos: en dos ocupaban tres filas para nada. */}
                <div className='grid gap-4 border-t pt-4 sm:grid-cols-3'>
                  {(
                    [
                      ['publisherName', 'Publisher'],
                      ['volume', 'Volume'],
                      ['issue', 'Issue'],
                      ['pages', 'Pages'],
                      ['isbn', 'ISBN'],
                      ['issn', 'ISSN'],
                    ] as const
                  ).map(([nombre, etiqueta]) => (
                    <FormField
                      key={nombre}
                      control={form.control}
                      name={nombre}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{etiqueta}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <div className='grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end'>
                  <FormField
                    control={form.control}
                    name='doi'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DOI</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='10.1016/j.jet.2024.01.001'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='isOpenAccess'
                    render={({ field }) => (
                      <FormItem className='flex items-center gap-2 pb-2'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className='!mt-0'>Open access</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <LinksSection value={enlaces} onChange={setEnlaces} />
                <div className='border-t pt-4'>
                  <FilesSection value={archivos} onChange={setArchivos} />
                </div>
              </CardContent>
            </Card>

            <CollapsibleCard
              title='More options'
              description='Version, manual citation, position in Research.'
              forceOpen={CAMPOS_PLEGADOS.some(
                (campo) => form.formState.errors[campo] !== undefined
              )}
            >
              <div className='grid gap-4 sm:grid-cols-2'>
                {(
                  [
                    ['versionLabel', 'Version'],
                    ['downloadCode', 'Download code'],
                  ] as const
                ).map(([nombre, etiqueta]) => (
                  <FormField
                    key={nombre}
                    control={form.control}
                    name={nombre}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{etiqueta}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              <FormField
                control={form.control}
                name='displayOrder'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position in Research</FormLabel>
                    <div className='grid gap-1 sm:grid-cols-[minmax(0,10rem)_1fr] sm:items-center sm:gap-3'>
                      <FormControl>
                        <Input inputMode='numeric' placeholder='1' {...field} />
                      </FormControl>
                      {/* La ayuda va al lado del campo. Debajo, en una columna de
                          160px, salia en ocho lineas rotas. */}
                      <FormDescription className='!mt-0'>
                        1 goes first within its type. Empty, it falls in by
                        year.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 border-t pt-4'>
                <p className='text-sm text-muted-foreground'>
                  The citation and the BibTeX are written on their own from the
                  data above. Fill these in only for a specific format.
                </p>
                <FormField
                  control={form.control}
                  name='citationTextOverride'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual citation</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='bibtexOverride'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual BibTeX</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          className='font-mono text-xs'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Las citas por estilo se guardan por su cuenta: cada una es un registro
                  propio, y escribir una no deberia obligar a guardar el trabajo entero.
                  Por eso va dentro del <form> pero sin campos suyos. */}
              {workId !== undefined && (
                <div className='border-t pt-4'>
                  <CitationsSection workId={workId} />
                </div>
              )}
            </CollapsibleCard>

            {form.formState.errors.root && (
              <p className='text-sm text-destructive' role='alert'>
                {form.formState.errors.root.message}
              </p>
            )}

            <div className='sticky bottom-0 flex justify-end gap-2 border-t bg-background py-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  void navigate({ to: '/admin/works' })
                }}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={mutation.isPending}>
                <Save /> {mutation.isPending ? 'Saving...' : 'Save draft'}
              </Button>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
