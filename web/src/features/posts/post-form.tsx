import { useRef, useState } from 'react'
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
import { ImagePicker } from '@/components/media-picker'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import { createPost, getPost, updatePost, type PostItem } from './api'
import {
  AttachmentsSection,
  type AttachmentDraft,
} from './components/attachments-section'
import { InsertImageButton } from './components/insert-image-button'
import { type PostKind } from './kinds'

/**
 * El formulario de una entrada, con la forma que pida su tipo.
 *
 * En una noticia no se enseñan ni el cuerpo ni los adjuntos: no es que esten
 * deshabilitados, es que no estan. Una pantalla que pide lo que esa forma no necesita
 * hace dudar de si hace falta rellenarlo.
 */

const formSchema = z.object({
  title: z.string().trim().min(1, 'Required.').max(300),
  summary: z.string().max(2000),
  contentMarkdown: z.string().max(100000),
  imageAlt: z.string().max(500),
  // Texto y no numero: un campo numerico vacio da `NaN` en lugar de «sin orden».
  displayOrder: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Whole number, or leave it empty.'),
})

type FormValues = z.infer<typeof formSchema>

type Props = { tipo: PostKind; postId?: string }

export function PostForm({ tipo, postId }: Props) {
  const esEdicion = postId !== undefined

  const { data: entrada, isLoading } = useQuery({
    queryKey: queryKeys.posts.detail(postId ?? ''),
    queryFn: () => getPost(postId as string),
    enabled: esEdicion,
  })

  if (esEdicion && isLoading) {
    return (
      <Main>
        <p className='text-muted-foreground'>Loading...</p>
      </Main>
    )
  }

  return <Campos key={entrada?.id ?? 'nuevo'} tipo={tipo} post={entrada} />
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

function Campos({
  tipo,
  post,
}: {
  tipo: PostKind
  post: PostItem | undefined
}) {
  const navigate = useNavigate()
  const esEdicion = post !== undefined

  const [imageMediaId, setImageMediaId] = useState<string | null>(
    post?.imageMediaId ?? null
  )
  const [adjuntos, setAdjuntos] = useState<AttachmentDraft[]>(() =>
    (post?.files ?? []).map((archivo) => ({
      mediaId: archivo.mediaId,
      // El nombre real se pide aparte; aqui basta con el rotulo que ya tenia.
      filename: archivo.label ?? archivo.mediaId,
      label: archivo.label ?? '',
      isPublic: archivo.isPublic,
    }))
  )

  // Para poder escribir la imagen donde estaba el cursor y no al final del todo.
  const cuerpo = useRef<HTMLTextAreaElement | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: post?.title ?? '',
      summary: post?.summary ?? '',
      contentMarkdown: post?.contentMarkdown ?? '',
      imageAlt: post?.imageAlt ?? '',
      displayOrder:
        post?.displayOrder === null || post?.displayOrder === undefined
          ? ''
          : String(post.displayOrder),
    },
  })

  const insertarEnCuerpo = (fragmento: string) => {
    const actual = form.getValues('contentMarkdown')
    const posicion = cuerpo.current?.selectionStart ?? actual.length
    const antes = actual.slice(0, posicion)
    const despues = actual.slice(posicion)
    // En su propio parrafo: pegada al texto anterior, Markdown la trataria como parte
    // de esa linea y no como un bloque.
    const separador = antes === '' || antes.endsWith('\n') ? '' : '\n\n'
    form.setValue(
      'contentMarkdown',
      `${antes}${separador}${fragmento}\n\n${despues}`,
      { shouldDirty: true }
    )
  }

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        kind: tipo.code,
        title: values.title,
        summary: vacioANull(values.summary),
        // Una noticia no lleva cuerpo ni adjuntos: se envia vacio a proposito, para que
        // cambiar de forma no deje detras contenido que ya no se ve ni se puede editar.
        contentMarkdown: tipo.conCuerpo
          ? vacioANull(values.contentMarkdown)
          : null,
        imageMediaId,
        imageAlt: vacioANull(values.imageAlt),
        displayOrder:
          values.displayOrder === '' ? null : Number(values.displayOrder),
        files: tipo.conCuerpo
          ? adjuntos.map((archivo, indice) => ({
              mediaId: archivo.mediaId,
              label: vacioANull(archivo.label),
              sortOrder: indice,
              isPublic: archivo.isPublic,
            }))
          : [],
      }
      return esEdicion
        ? updatePost(post.id, payload)
        : createPost({ ...payload, slug: '' })
    },
    invalidates: [queryKeys.posts.all],
    success: esEdicion ? 'Saved.' : 'Created.',
    onSuccess: (guardado) => {
      if (!esEdicion) {
        void navigate({
          to: '/admin/posts/$kind/$postId',
          params: { kind: tipo.segment, postId: guardado.id },
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
              aria-label={`Back to ${tipo.plural}`}
              onClick={() => {
                void navigate({
                  to: '/admin/posts/$kind',
                  params: { kind: tipo.segment },
                })
              }}
            >
              <ArrowLeft className='size-4' />
            </Button>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                {esEdicion ? post.title : `New ${tipo.singular}`}
              </h2>
              {esEdicion && (
                <p className='text-sm text-muted-foreground'>/{post.slug}</p>
              )}
            </div>
          </div>
          {esEdicion && post.editorialStatus === 'draft' && (
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
                <CardTitle>What it says</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <FormField
                  control={form.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            tipo.conCuerpo
                              ? 'What I learned teaching first-year micro'
                              : 'ARC grant for the department'
                          }
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
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Textarea rows={tipo.conCuerpo ? 2 : 4} {...field} />
                      </FormControl>
                      <FormDescription>
                        {tipo.conCuerpo
                          ? 'This is what appears in the list, before opening it.'
                          : 'A news item is its title and this. Keep it short.'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='displayOrder'
                  render={({ field }) => (
                    <FormItem className='sm:max-w-xs'>
                      <FormLabel>Pinned order</FormLabel>
                      <FormControl>
                        <Input inputMode='numeric' placeholder='' {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave it empty and it goes by date, newest first. With a
                        number it is pinned above, lowest first.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {tipo.conCuerpo && (
              <Card>
                <CardHeader>
                  <CardTitle>Body</CardTitle>
                </CardHeader>
                <CardContent className='grid gap-4'>
                  <InsertImageButton onInsert={insertarEnCuerpo} />
                  <FormField
                    control={form.control}
                    name='contentMarkdown'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Text</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={16}
                            {...field}
                            ref={(elemento) => {
                              field.ref(elemento)
                              cuerpo.current = elemento
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Markdown: <code>##</code> for a heading,{' '}
                          <code>**bold**</code>,{' '}
                          <code>[text](https://...)</code> for a link.
                        </FormDescription>
                        <FormDescription>
                          <strong>Video:</strong> paste the address from your
                          browser bar on a line of its own and it becomes a
                          player — for example{' '}
                          <code>
                            https://www.youtube.com/watch?v=dQw4w9WgXcQ
                          </code>
                          . YouTube and Vimeo only. Video is embedded, not
                          hosted here: a file this size would have to be
                          downloaded whole before it could be skipped through.
                        </FormDescription>
                        <FormDescription>
                          <strong>Images:</strong> use the button above. Only
                          images uploaded here can be placed in the text: one
                          hosted elsewhere would tell that server the address of
                          every reader.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <ImagePicker value={imageMediaId} onChange={setImageMediaId} />
                {imageMediaId !== null && (
                  <FormField
                    control={form.control}
                    name='imageAlt'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image description</FormLabel>
                        <FormControl>
                          <Input placeholder='The team in the lab' {...field} />
                        </FormControl>
                        <FormDescription>
                          It is read by those who browse without seeing the
                          image.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {tipo.conCuerpo && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  <AttachmentsSection value={adjuntos} onChange={setAdjuntos} />
                </CardContent>
              </Card>
            )}

            <div className='sticky bottom-0 flex justify-end border-t bg-background py-4'>
              <Button type='submit' disabled={guardar.isPending}>
                {guardar.isPending ? (
                  <Loader2 className='animate-spin' />
                ) : (
                  <Save />
                )}
                {esEdicion ? 'Save' : `Create ${tipo.singular}`}
              </Button>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
