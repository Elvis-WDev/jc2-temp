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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createVenue, updateVenue, type Venue } from '../api'

const formSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(300),
  abbreviation: z.string().trim().max(100),
  venueType: z.string(),
  publisherName: z.string().trim().max(300),
  issn: z.string().trim().max(20),
  isbnPrefix: z.string().trim().max(30),
  countryCode: z.string().trim().length(2, 'Dos letras.').or(z.literal('')),
  websiteUrl: z.url('Invalid URL.').or(z.literal('')),
  ranking: z.string().trim().max(50),
  // Texto y no numero: un campo numerico vacio da NaN y rompe el resolver antes de
  // poder mostrar un mensaje util.
  citeScore: z
    .string()
    .refine(
      (valor) => valor === '' || !Number.isNaN(Number(valor)),
      'Write a number.'
    ),
  notes: z.string().max(5000),
})

type FormValues = z.infer<typeof formSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue?: Venue
}

const SIN_TIPO = 'ninguno'
const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

export function VenueFormDialog({ open, onOpenChange, ...resto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <Campos onOpenChange={onOpenChange} {...resto} />
      </DialogContent>
    </Dialog>
  )
}

function Campos({ onOpenChange, venue }: Omit<Props, 'open'>) {
  const esEdicion = venue !== undefined
  const { terminos } = useCatalogTerms('venue')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: venue?.name ?? '',
      abbreviation: venue?.abbreviation ?? '',
      venueType: venue?.venueType ?? SIN_TIPO,
      publisherName: venue?.publisherName ?? '',
      issn: venue?.issn ?? '',
      isbnPrefix: venue?.isbnPrefix ?? '',
      countryCode: venue?.countryCode ?? '',
      websiteUrl: venue?.websiteUrl ?? '',
      ranking: venue?.ranking ?? '',
      citeScore:
        venue?.citeScore === null || venue === undefined
          ? ''
          : String(venue.citeScore),
      notes: venue?.notes ?? '',
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        name: values.name,
        abbreviation: vacioANull(values.abbreviation),
        venueType: values.venueType === SIN_TIPO ? null : values.venueType,
        publisherName: vacioANull(values.publisherName),
        issn: vacioANull(values.issn),
        isbnPrefix: vacioANull(values.isbnPrefix),
        countryCode: vacioANull(values.countryCode),
        websiteUrl: vacioANull(values.websiteUrl),
        ranking: vacioANull(values.ranking),
        citeScore:
          values.citeScore.trim() === '' ? null : Number(values.citeScore),
        notes: vacioANull(values.notes),
      }
      return esEdicion ? updateVenue(venue.id, payload) : createVenue(payload)
    },
    // Los trabajos tambien: muestran el nombre de la revista y cambia al renombrarla.
    invalidates: [queryKeys.venues.all, queryKeys.works.all],
    success: esEdicion ? 'Venue updated.' : 'Venue created.',
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (error) => applyApiFieldErrors(form, error),
  })

  const campo = (
    nombre: keyof FormValues,
    etiqueta: string,
    marcador?: string,
    ayuda?: string
  ) => (
    <FormField
      control={form.control}
      name={nombre}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{etiqueta}</FormLabel>
          <FormControl>
            <Input
              {...(marcador === undefined ? {} : { placeholder: marcador })}
              {...field}
            />
          </FormControl>
          {ayuda !== undefined && <FormDescription>{ayuda}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          guardar.mutate(values)
        })}
        className='grid gap-4 sm:grid-cols-2'
      >
        <DialogHeader className='sm:col-span-2'>
          <DialogTitle>{esEdicion ? 'Edit venue' : 'New venue'}</DialogTitle>
          <DialogDescription>
            The journal, publisher or conference. The volume and the pages go on
            each work, not here.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder='Journal of Economic Theory' {...field} />
              </FormControl>
              <FormDescription>
                It cannot be repeated: it is what makes the record reusable.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {campo('abbreviation', 'Abreviatura', 'JET')}

        <FormField
          control={form.control}
          name='venueType'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Not specified' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={SIN_TIPO}>Not specified</SelectItem>
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
              <FormDescription>You manage it in Catalogues.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {campo('publisherName', 'Editorial', 'Elsevier')}
        {campo('countryCode', 'Pais', 'NL', 'Dos letras.')}
        {campo('issn', 'ISSN', '0022-0531')}
        {campo('isbnPrefix', 'Prefijo ISBN', '978-0-12')}
        {campo('ranking', 'Ranking', 'Q1', 'However you use it: Q1, A*, 4*...')}
        {campo('citeScore', 'CiteScore', '2.4')}

        <FormField
          control={form.control}
          name='websiteUrl'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder='https://...' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='notes'
          render={({ field }) => (
            <FormItem className='sm:col-span-2'>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormDescription>Only you can see them.</FormDescription>
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
            {esEdicion ? 'Save' : 'Crear'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}
