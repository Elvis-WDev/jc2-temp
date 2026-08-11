import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Save } from 'lucide-react'
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
import { ThemeSwitch } from '@/components/theme-switch'
import { getProfile, updateProfile, type Profile } from './api'

const opcionalUrl = z.url('Invalid URL.').or(z.literal(''))

const formSchema = z.object({
  fullName: z.string().trim().min(1, 'Required.').max(200),
  givenName: z.string().trim().max(100),
  familyName: z.string().trim().max(100),
  preferredName: z.string().trim().max(150),
  professionalTitle: z.string().trim().max(200),
  currentPosition: z.string().trim().max(250),
  publicEmail: z.email('Invalid email address.').or(z.literal('')),
  phone: z.string().trim().max(50),
  city: z.string().trim().max(120),
  countryCode: z.string().trim().length(2, 'Dos letras.').or(z.literal('')),
  shortBio: z.string().max(2000),
  fullBioMarkdown: z.string().max(50000),
  researchStatementMarkdown: z.string().max(50000),
  orcid: z.string().trim().max(40),
  googleScholarUrl: opcionalUrl,
  scopusUrl: opcionalUrl,
  ssrnUrl: opcionalUrl,
  repecUrl: opcionalUrl,
  websiteUrl: opcionalUrl,
})

type FormValues = z.infer<typeof formSchema>

const texto = (valor: string | null) => valor ?? ''
const nullSiVacio = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

function aValores(profile: Profile): FormValues {
  return {
    fullName: profile.fullName,
    givenName: texto(profile.givenName),
    familyName: texto(profile.familyName),
    preferredName: texto(profile.preferredName),
    professionalTitle: texto(profile.professionalTitle),
    currentPosition: texto(profile.currentPosition),
    publicEmail: texto(profile.publicEmail),
    phone: texto(profile.phone),
    city: texto(profile.city),
    countryCode: texto(profile.countryCode),
    shortBio: texto(profile.shortBio),
    fullBioMarkdown: texto(profile.fullBioMarkdown),
    researchStatementMarkdown: texto(profile.researchStatementMarkdown),
    orcid: texto(profile.orcid),
    googleScholarUrl: texto(profile.googleScholarUrl),
    scopusUrl: texto(profile.scopusUrl),
    ssrnUrl: texto(profile.ssrnUrl),
    repecUrl: texto(profile.repecUrl),
    websiteUrl: texto(profile.websiteUrl),
  }
}

export function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  })

  if (isLoading || data === undefined) {
    return (
      <Main>
        <p className='text-muted-foreground'>Loading profile...</p>
      </Main>
    )
  }

  return <ProfileFields profile={data} />
}

function ProfileFields({ profile }: { profile: Profile }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: aValores(profile),
  })

  const mutation = useToastMutation({
    mutationFn: (values: FormValues) =>
      updateProfile({
        fullName: values.fullName,
        givenName: nullSiVacio(values.givenName),
        familyName: nullSiVacio(values.familyName),
        preferredName: nullSiVacio(values.preferredName),
        professionalTitle: nullSiVacio(values.professionalTitle),
        currentPosition: nullSiVacio(values.currentPosition),
        publicEmail: nullSiVacio(values.publicEmail),
        phone: nullSiVacio(values.phone),
        city: nullSiVacio(values.city),
        countryCode: nullSiVacio(values.countryCode),
        shortBio: nullSiVacio(values.shortBio),
        fullBioMarkdown: nullSiVacio(values.fullBioMarkdown),
        researchStatementMarkdown: nullSiVacio(
          values.researchStatementMarkdown
        ),
        orcid: nullSiVacio(values.orcid),
        googleScholarUrl: nullSiVacio(values.googleScholarUrl),
        scopusUrl: nullSiVacio(values.scopusUrl),
        ssrnUrl: nullSiVacio(values.ssrnUrl),
        repecUrl: nullSiVacio(values.repecUrl),
        websiteUrl: nullSiVacio(values.websiteUrl),
      }),
    invalidates: [queryKeys.profile],
    success: 'Profile updated. The changes are already visible on your site.',
    onError: (error) => {
      // Si el servidor senala campos concretos, se marcan en el formulario y ahi acaba:
      // un aviso flotante encima solo repetiria lo que ya esta senalado al lado.
      if (applyApiFieldErrors(form, error)) return true
      // Cualquier otro fallo lo cuenta el aviso comun, igual que en el resto del panel.
      return false
    },
  })

  const campo = (
    nombre: keyof FormValues,
    etiqueta: string,
    ayuda?: string
  ) => (
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
          {ayuda !== undefined && <FormDescription>{ayuda}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Perfil academico
          </h2>
          <p className='text-muted-foreground'>
            What is shown on the home page of your site.
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
                <CardTitle>Identity</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                {campo('fullName', 'Full name')}
                {campo(
                  'preferredName',
                  'Display name',
                  'If you prefer to show a different one.'
                )}
                {campo('givenName', 'Name')}
                {campo('familyName', 'Apellidos')}
                {campo('professionalTitle', 'Professional title')}
                {campo('currentPosition', 'Cargo actual')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                {campo('publicEmail', 'Email publico')}
                {/* ERS §8 lo marca "normalmente no visible": se puede guardar, pero no
                    sale en el perfil publico. */}
                {campo('phone', 'Telefono', 'It is not published on the site.')}
                {campo('city', 'Ciudad')}
                {campo('countryCode', 'Pais (ISO)')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Biography</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <FormField
                  control={form.control}
                  name='shortBio'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short bio</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the one that appears on the home page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='fullBioMarkdown'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extended bio</FormLabel>
                      <FormControl>
                        <Textarea rows={6} {...field} />
                      </FormControl>
                      <FormDescription>
                        You can use Markdown for bold, lists and links.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='researchStatementMarkdown'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Research statement</FormLabel>
                      <FormControl>
                        <Textarea rows={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Academic profiles</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2'>
                {campo('orcid', 'ORCID')}
                {campo('googleScholarUrl', 'Google Scholar')}
                {campo('scopusUrl', 'Scopus')}
                {campo('ssrnUrl', 'SSRN')}
                {campo('repecUrl', 'RePEc')}
                {campo('websiteUrl', 'Web personal')}
              </CardContent>
            </Card>

            {/* Los fallos que no apuntan a un campo salen en el aviso flotante. Este
                formulario es largo: un texto al final se queda fuera de la pantalla
                justo cuando hace falta leerlo. */}
            <div className='sticky bottom-0 flex justify-end border-t bg-background py-4'>
              <Button type='submit' disabled={mutation.isPending}>
                <Save /> {mutation.isPending ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
