import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicSite } from './api'
import { SiteLayout } from './site-layout'

const getSite = vi.fn()

vi.mock('./api', () => ({ getSite: () => getSite() }))

// La cabecera y el pie usan `Link` y `Outlet`, que fuera de un router no saben donde
// estan. Se sustituyen por lo minimo: un ancla y un hueco.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    // `activeProps` y `activeOptions` los entiende el router, no el DOM: si se
    // reenvian, React avisa por consola en cada prueba.
    activeProps: _activeProps,
    activeOptions: _activeOptions,
    ...resto
  }: {
    children: React.ReactNode
    to: string
    activeProps?: unknown
    activeOptions?: unknown
  }) => (
    <a href={to} {...resto}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid='contenido' />,
}))

const SITIO: PublicSite = {
  siteName: 'Juana Castro',
  footerText: '© 2026 Juana Castro.',
  contactEmail: null,
  logoUrl: null,
  footerImageUrl: null,
  meta: { title: null, description: null, ogImageUrl: null },
  pages: {
    research: true,
    teaching: true,
    events: false,
    news: false,
    blog: false,
  },
  sections: {},
  sectionBackgrounds: {},
  sectionHeadings: {},
  owner: {
    fullName: 'Juana Castro',
    publicEmail: 'juana@ejemplo.edu',
    orcid: '0000-0002-1825-0097',
    cvUrl: null,
    scholarUrls: {
      googleScholar: 'https://scholar.google.com/x',
      scopus: null,
      ssrn: null,
      repec: null,
      website: null,
    },
    links: [],
  },
}

function pintar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteLayout />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getSite.mockResolvedValue(SITIO)
})

describe('envoltura del sitio publico', () => {
  it('la cabecera muestra el nombre del sitio', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro').first()).toBeVisible()
  })

  it('el pie sale en cualquier pagina, no solo en la portada', async () => {
    // Antes vivia dentro de la portada, asi que Research y Teaching se quedaban sin el.
    const screen = await pintar()

    await expect.element(screen.getByText('Academic profiles')).toBeVisible()
    await expect.element(screen.getByText('© 2026 Juana Castro.')).toBeVisible()
  })

  it('el menu solo ofrece las paginas visibles', async () => {
    // Enlazar una pagina oculta lleva a un 404, asi que no se enlaza.
    getSite.mockResolvedValue({
      ...SITIO,
      pages: {
        research: true,
        teaching: false,
        events: false,
        news: false,
        blog: false,
      },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Research')).toBeVisible()
    await expect.element(screen.getByText('Teaching')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Events')).not.toBeInTheDocument()
    await expect.element(screen.getByText('News')).not.toBeInTheDocument()
    await expect.element(screen.getByText('Blog')).not.toBeInTheDocument()
  })

  it('noticias y blog aparecen cuando su pagina esta encendida', async () => {
    // La API ya combina las dos condiciones: pagina visible Y algo publicado. Aqui solo
    // se comprueba que el menu la respeta, igual que hace con Eventos.
    getSite.mockResolvedValue({
      ...SITIO,
      pages: {
        research: false,
        teaching: false,
        events: false,
        news: true,
        blog: true,
      },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('News')).toBeVisible()
    await expect.element(screen.getByText('Blog')).toBeVisible()
  })

  it('mientras no se sabe que hay, solo Inicio', async () => {
    // Mejor un menu corto un instante que uno que enlaza lo que no se puede abrir.
    getSite.mockRejectedValue(new Error('caida'))
    const screen = await pintar()

    await expect.element(screen.getByText('Home')).toBeVisible()
    await expect.element(screen.getByText('Research')).not.toBeInTheDocument()
  })

  it('no enlaza al panel por ningun sitio', async () => {
    // Es deliberado: el sitio publico no anuncia donde se administra.
    const screen = await pintar()
    await expect.element(screen.getByText('Academic profiles')).toBeVisible()

    expect(document.querySelectorAll('a[href*="/admin"]')).toHaveLength(0)
  })

  it('una columna del pie sin nada dentro no se pinta', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Academic profiles')).toBeVisible()
    // No hay CV publicado, y un titulo con el hueco debajo parece algo roto.
    await expect.element(screen.getByText('Documents')).not.toBeInTheDocument()
  })

  it('con CV publicado aparece su columna', async () => {
    getSite.mockResolvedValue({
      ...SITIO,
      owner: { ...SITIO.owner, cvUrl: '/api/public/media/abc' },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Curriculum vitae')).toBeVisible()
  })

  it('si la configuracion no carga, el contenido de la pagina sigue viendose', async () => {
    // Un pie a medias no vale la pena; el cuerpo de la pagina si.
    getSite.mockRejectedValue(new Error('caida'))
    const screen = await pintar()

    await expect.element(screen.getByTestId('contenido')).toBeInTheDocument()
    await expect
      .element(screen.getByText('Academic profiles'))
      .not.toBeInTheDocument()
  })
})

describe('la imagen del pie', () => {
  it('con imagen elegida, abre la primera columna', async () => {
    getSite.mockResolvedValue({
      ...SITIO,
      footerImageUrl: '/api/public/media/abc',
    })
    const screen = await pintar()

    const imagen = screen.getByRole('presentation')
    await expect.element(imagen).toHaveAttribute('src', '/api/public/media/abc')
  })

  it('sin imagen, las otras columnas no se mueven de sitio', async () => {
    // La columna sigue existiendo vacia: si desapareciera, poner o quitar la imagen
    // desplazaria los perfiles y el contacto.
    const screen = await pintar()
    await expect.element(screen.getByText('Academic profiles')).toBeVisible()

    await expect
      .element(screen.getByRole('presentation'))
      .not.toBeInTheDocument()
  })
})
