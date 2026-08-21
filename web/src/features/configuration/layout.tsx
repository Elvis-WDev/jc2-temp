import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SECCIONES } from './secciones'

/**
 * Configuracion: los vocabularios del sistema, en un solo sitio.
 *
 * Son ocho pantallas que se tocan una vez al ano —doce tipos de trabajo, nueve estados,
 * seis revistas— y ocupaban ocho entradas del menu. Aqui pasan a ser ocho pestanas de un
 * mismo modulo.
 *
 * **Cada una conserva su ruta.** No se juntan en una sola pantalla con pestanas internas
 * porque cada listado guarda su pagina, su busqueda y sus filtros en la direccion, y las
 * ocho usan los mismos nombres: `page`, `q`, `active`. En una ruta compartida, cambiar de
 * pestana arrastraria los filtros de la anterior y un enlace a un listado filtrado
 * dejaria de valer, que es justo lo que el proyecto decidio conservar.
 */
/**
 * El marco del modulo: cabecera, titulo y pestanas.
 *
 * Lo pinta cada seccion en lugar de su propio encabezado. Antes las ocho repetian el
 * mismo bloque de cabecera y su propio titulo; ahora el titulo lo dice la pestana activa
 * y cada seccion solo aporta lo suyo.
 */
export function ConfigurationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { pathname } = useLocation()

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
          <h2 className='text-2xl font-bold tracking-tight'>Configuration</h2>
          <p className='text-muted-foreground'>
            The vocabularies the panel offers in its dropdowns. You set them up
            once.
          </p>
        </div>

        <nav
          aria-label='Configuration sections'
          className='flex flex-wrap gap-1 border-b'
        >
          {SECCIONES.map((seccion) => {
            const activa = pathname.startsWith(seccion.url)
            return (
              <Link
                key={seccion.url}
                to={seccion.url}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
                  activa
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {seccion.titulo}
              </Link>
            )
          })}
        </nav>

        {children}
      </Main>
    </>
  )
}
