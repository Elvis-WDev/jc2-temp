import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { FileText, GraduationCap, Plus, UserCog } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { LOCALE } from '@/lib/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { getDashboardMetrics } from './api'

const FORMATO_FECHA = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })

type Metrica = { etiqueta: string; valor: number; icono: React.ElementType }

/**
 * Panel de inicio (ERS §51).
 *
 * Recuentos y accesos rapidos, nada mas. El ERS advierte de no convertir cada conjunto
 * de datos en un cuadro de mandos: aqui lo util es saber que hay pendiente y poder
 * empezar una tarea en un clic.
 */
export function Dashboard() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardMetrics,
  })

  const metricas: Metrica[] = [
    {
      etiqueta: 'Published work',
      valor: data?.publishedWorks ?? 0,
      icono: FileText,
    },
    { etiqueta: 'Drafts', valor: data?.draftWorks ?? 0, icono: FileText },
    { etiqueta: 'Courses', valor: data?.courses ?? 0, icono: GraduationCap },
    {
      etiqueta: 'Active offerings',
      valor: data?.activeCourseOfferings ?? 0,
      icono: GraduationCap,
    },
  ]

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Dashboard</h2>
            <p className='text-muted-foreground'>
              State of the site's content.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              onClick={() => {
                void navigate({ to: '/admin/works/new' })
              }}
            >
              <Plus /> New work
            </Button>
            <Button
              variant='outline'
              onClick={() => {
                void navigate({ to: '/admin/profile' })
              }}
            >
              <UserCog /> Edit profile
            </Button>
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
          {metricas.map((metrica) => (
            <Card key={metrica.etiqueta}>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {metrica.etiqueta}
                </CardTitle>
                <metrica.icono
                  className='size-4 text-muted-foreground'
                  aria-hidden
                />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className='h-8 w-16' />
                ) : (
                  <p className='text-2xl font-bold tabular-nums'>
                    {metrica.valor}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latest changes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='grid gap-2'>
                {Array.from({ length: 3 }).map((_, indice) => (
                  <Skeleton
                    key={`carga-${String(indice)}`}
                    className='h-10 w-full'
                  />
                ))}
              </div>
            ) : (data?.lastUpdated ?? []).length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                Nothing has been edited yet.
              </p>
            ) : (
              <ul className='divide-y'>
                {(data?.lastUpdated ?? []).map((elemento) => (
                  <li
                    key={`${elemento.type}-${elemento.id}`}
                    className='flex items-center justify-between gap-3 py-2'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>
                        {elemento.title}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {elemento.type === 'work' ? 'Work' : 'Course'} ·{' '}
                        {FORMATO_FECHA.format(new Date(elemento.updatedAt))}
                      </p>
                    </div>
                    {elemento.type === 'work' && (
                      <Button asChild variant='ghost' size='sm'>
                        <Link
                          to='/admin/works/$workId'
                          params={{ workId: elemento.id }}
                        >
                          Open
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
