import { useQuery } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { cn } from '@/lib/utils'
import { useSiteIcon } from '@/hooks/use-site-icon'
import { getSite, type PublicSite } from './api'

/**
 * Envoltura del sitio publico: cabecera, contenido y pie.
 *
 * Vive fuera del area autenticada. No comparte layout con el panel, no lleva su barra
 * lateral y **no enlaza a `/admin`**: el sitio publico no anuncia donde se administra.
 * Por eso tampoco esta el avatar redondo que la plantilla pone arriba a la derecha:
 * parece un menu de cuenta, y aqui no hay cuentas.
 *
 * `data-site` marca la rama del arbol que usa el tema claro del sitio, aunque el panel
 * este en oscuro (`styles/site.css`).
 *
 * Todo lo de aqui sale de `/api/public/site`, que es lo que no cambia de una pagina a
 * otra. El cuerpo lo pide cada pagina por su cuenta.
 */

/**
 * El menu.
 *
 * Inicio siempre; el resto solo si su pagina esta visible, porque enlazar una pagina
 * oculta lleva a un 404. Eventos, noticias y blog ademas necesitan tener algo
 * publicado.
 */
const INICIO = { etiqueta: 'Home', to: '/' } as const

const OPCIONALES = [
  { etiqueta: 'Research', to: '/research', pagina: 'research' },
  { etiqueta: 'Teaching', to: '/teaching', pagina: 'teaching' },
  { etiqueta: 'Events', to: '/events', pagina: 'events' },
  { etiqueta: 'News', to: '/news', pagina: 'news' },
  { etiqueta: 'Blog', to: '/blog', pagina: 'blog' },
] as const

export function SiteLayout() {
  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    // Cambia cuando el titular toca Configuracion del sitio, no cada minuto.
    staleTime: 5 * 60_000,
  })

  // El emblema hace tambien de favicon. Va aqui y no en cada pagina porque es del sitio
  // entero, no de la pantalla que se este viendo.
  useSiteIcon(site?.logoUrl ?? null)

  return (
    <div
      data-site
      className='flex min-h-svh flex-col bg-site-background font-site-body text-site-body-md text-site-on-background'
    >
      <SiteHeader site={site} />

      {/* La cabecera es fija, asi que el contenido arranca por debajo de ella. */}
      <main className='flex-1 pt-16'>
        <Outlet />
      </main>

      {/* Si la peticion falla no se pinta un pie a medias: el contenido de la pagina
          sigue siendo util sin el. */}
      {site !== undefined && <SiteFooter site={site} />}
    </div>
  )
}

function SiteHeader({ site }: { site: PublicSite | undefined }) {
  return (
    <header className='fixed top-0 z-50 w-full bg-site-primary-container shadow-[0_1px_8px_rgba(0,0,0,0.1)]'>
      <div className='mx-auto flex h-16 max-w-site items-center justify-between gap-6 px-site-margin lg:px-site-gutter'>
        <Link to='/' className='flex items-center gap-4' aria-label='Home'>
          {site?.logoUrl != null && (
            <img
              // Decorativo: el nombre va justo al lado, y repetirlo obligaria a
              // escucharlo dos veces con un lector de pantalla.
              alt=''
              src={site.logoUrl}
              className='h-8 w-auto object-contain'
            />
          )}
          {site !== undefined && (
            <span className='hidden font-site-display text-site-headline-sm tracking-tight text-site-on-primary sm:block'>
              {site.siteName}
            </span>
          )}
        </Link>

        <nav
          aria-label='Site sections'
          className='flex h-full items-center gap-site-gutter'
        >
          {menu(site).map((seccion) => (
            <Link
              key={seccion.to}
              to={seccion.to}
              className='flex h-full items-center text-site-label text-site-on-primary/70 uppercase transition-colors hover:text-site-on-primary'
              activeProps={{
                className:
                  'flex h-full items-center text-site-label uppercase text-site-on-primary font-bold border-b-2 border-site-on-tertiary-container',
              }}
              activeOptions={{ exact: true }}
            >
              {seccion.etiqueta}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

/** Mientras no se sabe que hay, solo Inicio: mejor un menu corto que uno que miente. */
function menu(
  site: PublicSite | undefined
): Array<{ etiqueta: string; to: string }> {
  if (site === undefined) return [INICIO]

  return [
    INICIO,
    ...OPCIONALES.filter((opcion) => site.pages[opcion.pagina]).map(
      (opcion) => ({
        etiqueta: opcion.etiqueta,
        to: opcion.to,
      })
    ),
  ]
}

function SiteFooter({ site }: { site: PublicSite }) {
  const { owner } = site
  const correo = owner.publicEmail ?? site.contactEmail

  const contactos = [
    ...(correo === null ? [] : [{ etiqueta: correo, url: `mailto:${correo}` }]),
    ...owner.links.map((enlace) => ({
      etiqueta: enlace.label ?? enlace.type,
      url: enlace.url,
    })),
  ]

  return (
    // El filete superior separa el pie de la ultima banda cuando las dos llevan el mismo
    // solido: sin el se funden en un solo bloque oscuro y la seccion pierde su borde.
    <footer className='w-full border-t border-site-on-primary/15 bg-site-primary-container text-site-on-primary'>
      <div className='mx-auto max-w-site px-site-margin py-site-section lg:px-site-gutter'>
        {/* Tres columnas: la imagen, los perfiles y el contacto. El CV, cuando lo
            hay, cuelga de los perfiles en vez de abrir una cuarta columna, que
            desbarataria la rejilla. */}
        <div className='grid grid-cols-1 gap-site-gutter md:grid-cols-3'>
          {site.footerImageUrl !== null ? (
            <div className='flex items-start'>
              <img
                src={site.footerImageUrl}
                // Decorativa: lo que dice ya esta escrito al lado, y el nombre del
                // archivo no le aporta nada a quien usa un lector de pantalla.
                alt=''
                className='w-full max-w-56 rounded-site'
              />
            </div>
          ) : (
            // Sin imagen la columna sigue existiendo, para que las otras dos no se
            // desplacen al ponerla o quitarla.
            <div aria-hidden />
          )}

          {/* Una columna sin nada dentro no se pinta: un titulo con el hueco debajo
              parece que algo se ha roto (ERS §55). */}
          <ColumnaDePie
            titulo='Academic profiles'
            enlaces={[
              ...repositorios(site),
              ...(owner.cvUrl === null
                ? []
                : [
                    {
                      etiqueta: 'Curriculum vitae',
                      url: owner.cvUrl,
                      icono: true,
                    },
                  ]),
            ]}
          />

          <ColumnaDePie titulo='Contact' enlaces={contactos} alineado='fin' />
        </div>

        {site.footerText !== null && (
          <div className='mt-site-gutter border-t border-site-on-primary/10 pt-site-gutter text-site-meta text-site-on-primary/60'>
            {site.footerText}
          </div>
        )}
      </div>
    </footer>
  )
}

function ColumnaDePie({
  titulo,
  enlaces,
  alineado = 'inicio',
}: {
  titulo: string
  enlaces: Array<{ etiqueta: string; url: string; icono?: boolean }>
  /** `fin` alinea la columna a la derecha, solo a partir de pantalla mediana. */
  alineado?: 'inicio' | 'fin'
}) {
  if (enlaces.length === 0) return null

  const alFinal = alineado === 'fin'

  return (
    <div
      className={cn(
        'space-y-site-unit',
        // En movil las columnas se apilan: alinear a la derecha ahi dejaria el texto
        // desperdigado contra el borde.
        alFinal && 'md:text-right'
      )}
    >
      <h2 className='text-site-label text-site-on-primary-container uppercase'>
        {titulo}
      </h2>
      <div className='flex flex-col gap-2'>
        {enlaces.map((enlace) => (
          <a
            key={enlace.url}
            href={enlace.url}
            rel='me noopener'
            className={cn(
              'flex items-center gap-2 text-site-on-primary/80 transition-colors hover:text-site-on-primary',
              alFinal && 'md:justify-end'
            )}
          >
            {enlace.icono === true && <FileText className='size-4' />}
            {enlace.etiqueta}
          </a>
        ))}
      </div>
    </div>
  )
}

/** Los perfiles academicos, en el orden en que un lector los busca. */
function repositorios(
  site: PublicSite
): Array<{ etiqueta: string; url: string }> {
  const { orcid, scholarUrls } = site.owner

  const candidatos = [
    { etiqueta: 'Google Scholar', url: scholarUrls.googleScholar },
    {
      etiqueta: 'ORCID',
      url: orcid === null ? null : `https://orcid.org/${orcid}`,
    },
    { etiqueta: 'Scopus', url: scholarUrls.scopus },
    { etiqueta: 'SSRN', url: scholarUrls.ssrn },
    { etiqueta: 'RePEc', url: scholarUrls.repec },
    { etiqueta: 'Personal website', url: scholarUrls.website },
  ]

  return candidatos.filter(
    (candidato): candidato is { etiqueta: string; url: string } =>
      candidato.url !== null
  )
}
