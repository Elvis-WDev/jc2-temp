import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicPageContent } from './api'
import { SiteTeaching } from './teaching'

const getPageContent = vi.fn()
const getSite = vi.fn()
const listTeaching = vi.fn()

// Se reemplaza el modulo entero, asi que tiene que traer todo lo que cuelga de la
// pagina: las tarjetas piden la ficha del curso al desplegarse.
vi.mock('./api', () => ({
  getPageContent: () => getPageContent(),
  getSite: () => getSite(),
  listTeaching: () => listTeaching(),
  getCourse: () => Promise.resolve(null),
}))

// La pagina lee su estado de la direccion y las tarjetas enlazan a la ficha. Fuera de un
// router nada de eso existe, asi que se sustituye por lo minimo que necesita.
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => ({ page: 1 }),
    useNavigate: () => () => undefined,
  }),
  Link: ({
    children,
    className,
    to,
  }: {
    children: React.ReactNode
    className?: string
    to?: string
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}))

const PAGINA: PublicPageContent = {
  pageKey: 'teaching',
  pageTitle: 'Teaching',
  eyebrow: null,
  introHtml: '<p>Lo que enseño.</p>',
  secondaryHtml: null,
  heroUrl: null,
  heroAlt: null,
}

function pintar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteTeaching />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getPageContent.mockResolvedValue(PAGINA)
  getSite.mockResolvedValue({
    siteName: 'Sitio',
    meta: { title: null, description: null, ogImageUrl: null },
    pages: { research: true, teaching: true, events: false },
    sections: {},
    sectionBackgrounds: {},
    sectionHeadings: {},
    owner: {
      fullName: 'Juana Castro',
      publicEmail: null,
      orcid: null,
      cvUrl: null,
      scholarUrls: {
        googleScholar: null,
        scopus: null,
        ssrn: null,
        repec: null,
        website: null,
      },
      links: [],
    },
  })
  listTeaching.mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 },
    facets: { institutions: [], departments: [], tags: [], levels: [] },
  })
})

describe('cabecera de Teaching', () => {
  it('con imagen elegida, la pinta junto al texto', async () => {
    getPageContent.mockResolvedValue({
      ...PAGINA,
      heroUrl: '/api/public/media/abc',
      heroAlt: 'Aula con una pizarra llena',
    })
    const screen = await pintar()

    const imagen = screen.getByRole('img', {
      name: 'Aula con una pizarra llena',
    })
    await expect.element(imagen).toBeVisible()
    await expect.element(imagen).toHaveAttribute('src', '/api/public/media/abc')
  })

  it('sin descripcion escrita, la imagen es decorativa', async () => {
    getPageContent.mockResolvedValue({
      ...PAGINA,
      heroUrl: '/api/public/media/abc',
      heroAlt: null,
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Teaching')).toBeVisible()

    await expect.element(screen.getByRole('img')).not.toBeInTheDocument()
  })

  it('sin imagen, la cabecera se queda como estaba', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Teaching')).toBeVisible()
    await expect.element(screen.getByRole('img')).not.toBeInTheDocument()
  })
})
