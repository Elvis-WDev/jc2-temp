import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { ImagePicker } from '@/components/image-picker'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getSiteSettings, updateSiteSettings, type SiteSettings } from './api'

/**
 * Ajustes del sitio. Es un registro único que se edita en su sitio, no una fila de una
 * tabla, así que va en una página y no en un modal.
 */

const formSchema = z.object({
  siteName: z.string().trim().min(1, 'Required.').max(200),
  publicBaseUrl: z.url('Write a full address, starting with https://'),
  defaultLocale: z.string().trim().min(1, 'Required.').max(10),
  timezone: z.string().trim().min(1, 'Required.').max(60),
  contactEmail: z.email('Invalid email address.').or(z.literal('')),
  metaTitleDefault: z.string().trim().max(200),
  metaDescriptionDefault: z.string().max(500),
  footerText: z.string().max(2000),
})

type FormValues = z.infer<typeof formSchema>

export function SiteSettingsPage() {
  const { data: ajustes, isLoading } = useQuery({
    queryKey: queryKeys.siteSettings,
    queryFn: getSiteSettings,
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Settings</h2>
          <p className='text-muted-foreground'>
            What your site is called and where it lives. What each page shows is
            managed in Page content.
          </p>
        </div>

        {isLoading || ajustes === undefined ? (
          <p className='text-muted-foreground'>Loading settings...</p>
        ) : (
          <Campos ajustes={ajustes} />
        )}
      </Main>
    </>
  )
}

const vacioANull = (valor: string) =>
  valor.trim() === '' ? null : valor.trim()

const texto = (valor: string | null) => valor ?? ''

function Campos({ ajustes }: { ajustes: SiteSettings }) {
  const [ogImageMediaId, setOgImageMediaId] = useState<string | null>(
    ajustes.ogImageMediaId
  )
  const [logoMediaId, setLogoMediaId] = useState<string | null>(
    ajustes.logoMediaId
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteName: ajustes.siteName,
      publicBaseUrl: ajustes.publicBaseUrl,
      defaultLocale: ajustes.defaultLocale,
      timezone: ajustes.timezone,
      contactEmail: texto(ajustes.contactEmail),
      metaTitleDefault: texto(ajustes.metaTitleDefault),
      metaDescriptionDefault: texto(ajustes.metaDescriptionDefault),
      footerText: texto(ajustes.footerText),
    },
  })

  const guardar = useToastMutation({
    mutationFn: (values: FormValues) =>
      updateSiteSettings({
        siteName: values.siteName,
        publicBaseUrl: values.publicBaseUrl,
        defaultLocale: values.defaultLocale,
        timezone: values.timezone,
        contactEmail: vacioANull(values.contactEmail),
        metaTitleDefault: vacioANull(values.metaTitleDefault),
        metaDescriptionDefault: vacioANull(values.metaDescriptionDefault),
        footerText: vacioANull(values.footerText),
        ogImageMediaId,
        logoMediaId,
      }),
    invalidates: [queryKeys.siteSettings],
    success: 'Settings saved.',
    onError: (error) => applyApiFieldErrors(form, error),
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          guardar.mutate(values)
        })}
        className='grid gap-4 sm:gap-6'
      >
        <Card>
          <CardHeader>
            <CardTitle>The site</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='siteName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    It appears in the browser tab.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='publicBaseUrl'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder='https://ejemplo.edu' {...field} />
                  </FormControl>
                  <FormDescription>
                    The links you share are built from it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='contactEmail'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact email</FormLabel>
                  <FormControl>
                    <Input placeholder='name@example.edu' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='defaultLocale'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormControl>
                    <Input placeholder='es' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='timezone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time zone</FormLabel>
                  <FormControl>
                    <Input placeholder='Australia/Sydney' {...field} />
                  </FormControl>
                  <FormDescription>Dates are shown in it.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='footerText'
              render={({ field }) => (
                <FormItem className='sm:col-span-2'>
                  <FormLabel>Footer text</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-2 sm:col-span-2'>
              <Label>Emblem</Label>
              <p className='text-sm text-muted-foreground'>
                The symbol in your site header, to the left of the menu. Without
                it the site name is shown. It has to be marked as public.
              </p>
              <ImagePicker value={logoMediaId} onChange={setLogoMediaId} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it looks when shared</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <FormField
              control={form.control}
              name='metaTitleDefault'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Used on the pages that do not have one of their own.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='metaDescriptionDefault'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormDescription>
                    The text that appears under the link in search engines.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid gap-2'>
              <Label>Sharing image</Label>
              <p className='text-sm text-muted-foreground'>
                The one that appears when someone pastes a link to your site
                into a social network or a chat.
              </p>
              <ImagePicker
                value={ogImageMediaId}
                onChange={setOgImageMediaId}
              />
            </div>
          </CardContent>
        </Card>

        <div className='sticky bottom-0 flex justify-end border-t bg-background py-4'>
          <Button type='submit' disabled={guardar.isPending}>
            {guardar.isPending ? (
              <Loader2 className='animate-spin' />
            ) : (
              <Save />
            )}
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  )
}
