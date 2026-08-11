import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { createPersonLink, updatePersonLink, type PersonLink } from '../api'

const formSchema = z.object({
  linkType: z.string().trim().min(1, 'Choose a type.').max(50),
  label: z.string().trim().max(100),
  url: z.url('Write a full address, starting with https://'),
  isPublic: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  personId: string
  link?: PersonLink
}

export function LinkFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, personId, link }: Omit<Props, 'open'>) {
  const esEdicion = link !== undefined
  const { terminos } = useCatalogTerms('person_link')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      linkType: link?.linkType ?? 'website',
      label: link?.label ?? '',
      url: link?.url ?? '',
      isPublic: link?.isPublic ?? true,
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        personId,
        linkType: values.linkType,
        label: values.label.trim() === '' ? null : values.label.trim(),
        url: values.url,
        isPublic: values.isPublic,
      }
      return esEdicion
        ? updatePersonLink(link.id, payload)
        : createPersonLink(payload)
    },
    invalidates: [queryKeys.personLinks.all],
    success: esEdicion ? 'Link updated.' : 'Link added.',
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
          <DialogTitle>{esEdicion ? 'Edit link' : 'New link'}</DialogTitle>
          <DialogDescription>
            Profiles and pages that accompany your name on the site.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='linkType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* `conValorActual` conserva el tipo guardado aunque se haya ocultado
                      del catalogo: si no, el desplegable saldria vacio y al guardar se
                      perderia el valor sin que nadie lo pidiera. */}
                  {conValorActual(terminos, field.value).map((tipo) => (
                    <SelectItem key={tipo.code} value={tipo.code}>
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
          name='url'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder='https://orcid.org/0000-0002-1825-0097'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='label'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link text</FormLabel>
              <FormControl>
                <Input placeholder='Mi ORCID' {...field} />
              </FormControl>
              <FormDescription>
                If you leave it empty the type name is used.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='isPublic'
          render={({ field }) => (
            <FormItem className='flex items-center justify-between gap-4 rounded-lg border px-3 py-2'>
              <div className='space-y-0.5'>
                <Label htmlFor='enlace-publico'>Visible on the site</Label>
                <p className='text-xs text-muted-foreground'>
                  {field.value
                    ? 'It appears on your public profile.'
                    : 'Only you see it, in this panel.'}
                </p>
              </div>
              <FormControl>
                <Switch
                  id='enlace-publico'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

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
            {esEdicion ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
