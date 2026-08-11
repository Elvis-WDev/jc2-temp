import { z } from 'zod'
import { useForm } from 'react-hook-form'
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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  NOMBRE_DE_PAGINA,
  PAGINA_SIEMPRE_VISIBLE,
  updatePageContent,
  type PageContent,
} from '../api'
import { SectionsSection } from './sections-section'

const formSchema = z.object({
  eyebrow: z.string().trim().max(120),
  pageTitle: z.string().trim().max(250),
  introMarkdown: z.string().max(50000),
  secondaryMarkdown: z.string().max(50000),
  isPublished: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  page: PageContent
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

export function PageFormDialog({ open, onOpenChange, page }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <Campos onOpenChange={onOpenChange} page={page} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, page }: Omit<Props, 'open'>) {
  // La imagen no va en el formulario: se elige aparte y se envía con el resto.

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eyebrow: page.eyebrow ?? '',
      pageTitle: page.pageTitle ?? '',
      introMarkdown: page.introMarkdown ?? '',
      secondaryMarkdown: page.secondaryMarkdown ?? '',
      isPublished: page.isPublished,
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) =>
      updatePageContent(page.pageKey, {
        eyebrow: vacioANull(values.eyebrow),
        pageTitle: vacioANull(values.pageTitle),
        introMarkdown: vacioANull(values.introMarkdown),
        secondaryMarkdown: vacioANull(values.secondaryMarkdown),
        isPublished: values.isPublished,
      }),
    invalidates: [queryKeys.pageContent.all],
    success: `${NOMBRE_DE_PAGINA[page.pageKey]} page saved.`,
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
          <DialogTitle>{NOMBRE_DE_PAGINA[page.pageKey]} page</DialogTitle>
          <DialogDescription>
            The header texts. The content listing is generated on its own.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='eyebrow'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eyebrow</FormLabel>
              <FormControl>
                <Input placeholder='Behavioural economics' {...field} />
              </FormControl>
              <FormDescription>The small line above the title.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='pageTitle'
          render={({ field }) => (
            <FormItem>
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
          name='introMarkdown'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intro</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormDescription>
                Goes below the title. Markdown is allowed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='secondaryMarkdown'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Secondary text</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>
                Goes at the end of the page. Markdown is allowed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Aqui hubo un campo "Header image" que el sitio publico nunca llego a
            pintar: se guardaba y no se veia. Su trabajo lo hace ahora el fondo de la
            seccion `header`, en el bloque de abajo, que si se pinta. La columna
            `hero_media_id` se queda en la base sin usar; borrarla es una migracion
            destructiva que nadie ha pedido. */}

        <FormField
          control={form.control}
          name='isPublished'
          render={({ field }) => {
            const siempreVisible = page.pageKey === PAGINA_SIEMPRE_VISIBLE
            return (
              <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
                <div className='space-y-0.5'>
                  <Label htmlFor='pagina-publicada'>Visible on the site</Label>
                  <p className='text-xs text-muted-foreground'>
                    {siempreVisible
                      ? 'The home page cannot be hidden: it is the root of your site.'
                      : field.value
                        ? 'It appears in the menu and its listing can be opened. Links to a specific record always work, visible or not.'
                        : 'Out of the menu, and its listing does not open. Links you have already shared to a specific record keep working.'}
                  </p>
                </div>
                <FormControl>
                  <Switch
                    id='pagina-publicada'
                    checked={field.value}
                    disabled={siempreVisible}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )
          }}
        />

        <div className='grid gap-2 border-t pt-4'>
          <Label>What appears on this page</Label>
          <p className='text-sm text-muted-foreground'>
            Cada bloque se enciende y se apaga por su cuenta. Se guarda al
            momento.
          </p>
          <SectionsSection pageKey={page.pageKey} />
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
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
