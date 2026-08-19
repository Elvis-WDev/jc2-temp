import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicPageContent } from './api'
import { SiteResearch } from './research'

const getPageContent = vi.fn()
const getSite = vi.fn()
const listResearch = vi.fn()

// Se reemplaza el modulo entero, asi que tiene que traer todo lo que cuelga de la
// pagina: las tarjetas piden la ficha completa al desplegarse.
vi.mock('./api', () => ({
  getPageContent: () => getPageContent(),
  getSite: () => getSite(),
  listResearch: () => listResearch(),
  getWork: () => Promise.resolve(null),
}))

// La pagina lee su estado de la direccion y las tarjetas enlazan a la ficha. Fuera de
// un router nada de eso existe, asi que se sustituye por lo minimo que necesita.
vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({
    useSearch: () => ({ sort: 'newest', page: 1 }),
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
  pageKey: 'research',
  pageTitle: 'Research',
  eyebrow: null,
  introHtml: '<p>Lo que investigo.</p>',
  secondaryHtml: null,
  heroUrl: null,
  heroAlt: null,
}

function trabajo(
  id: string,
  code: string,
  label: string,
  pluralLabel: string,
  title: string
) {
  return {
    id,
    slug: id,
    title,
    subtitle: null,
    type: { code, label, pluralLabel },
    academicStatus: 'published',
    academicStatusLabel: 'Publicado',
    year: 2024,
    venue: null,
    venueAbbreviation: null,
    venueRanking: null,
    volume: null,
    issue: null,
    doi: null,
    doiUrl: null,
    isOpenAccess: false,
    authors: ['Juana Castro'],
    tags: [],
    pdfUrl: null,
  }
}

function pintar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteResearch />
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
    // La API siempre lo manda: la ficha lo usa para no repetir al titular entre los
    // coautores.
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
  listResearch.mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    facets: { types: [], statuses: [], years: [], tags: [] },
  })
})

describe('cabecera de Research', () => {
  it('con imagen elegida, la pinta junto al texto', async () => {
    getPageContent.mockResolvedValue({
      ...PAGINA,
      heroUrl: '/api/public/media/abc',
      heroAlt: 'Pizarra con una subasta dibujada',
    })
    const screen = await pintar()

    const imagen = screen.getByRole('img', {
      name: 'Pizarra con una subasta dibujada',
    })
    await expect.element(imagen).toBeVisible()
    await expect.element(imagen).toHaveAttribute('src', '/api/public/media/abc')
  })

  it('la ilustracion va sin sombra y centrada, no pegada al pie del texto', async () => {
    // La cabecera ya es una banda con su propio color: una sombra ahi hace que la
    // imagen parezca pegada encima en lugar de formar parte de ella. Y se centra por su
    // cuenta, porque la rejilla alinea el texto de otra forma en cada pagina.
    getPageContent.mockResolvedValue({
      ...PAGINA,
      heroUrl: '/api/public/media/abc',
      heroAlt: 'Una ilustracion',
    })
    const screen = await pintar()

    const imagen = screen.getByRole('img', { name: 'Una ilustracion' })
    await expect.element(imagen).toBeVisible()

    const marco = document.querySelector(
      'img[alt="Una ilustracion"]'
    )?.parentElement

    expect(
      document.querySelector('img[alt="Una ilustracion"]')?.className
    ).not.toMatch(/shadow/)
    expect(marco?.className).toMatch(/self-center/)
  })

  it('sin descripcion escrita, la imagen es decorativa', async () => {
    getPageContent.mockResolvedValue({
      ...PAGINA,
      heroUrl: '/api/public/media/abc',
      heroAlt: null,
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Research')).toBeVisible()

    // Sin `alt` util, un lector de pantalla no debe anunciarla: describirla con el
    // nombre del archivo o con "imagen" solo mete ruido entre el titulo y el listado.
    await expect.element(screen.getByRole('img')).not.toBeInTheDocument()
  })

  it('sin imagen, la cabecera se queda solo con el texto', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Research')).toBeVisible()
    await expect.element(screen.getByRole('img')).not.toBeInTheDocument()
  })

  it('no repite el recuento de trabajos', async () => {
    // El «Archive · 16 works» de la cabecera se retiro: el numero ya lo dicen los
    // apartados por tipo, y en la cabecera solo competia con el titulo.
    const screen = await pintar()
    await expect.element(screen.getByText('Research')).toBeVisible()

    await expect.element(screen.getByText('Archive')).not.toBeInTheDocument()
  })
})

describe('listado de Research', () => {
  it('agrupa los trabajos bajo el rotulo de su tipo', async () => {
    listResearch.mockResolvedValue({
      items: [
        trabajo(
          'w1',
          'journal_article',
          'Journal Article',
          'Journal Articles',
          'Subastas'
        ),
        trabajo(
          'w2',
          'journal_article',
          'Journal Article',
          'Journal Articles',
          'Mecanismos'
        ),
        trabajo(
          'w3',
          'working_paper',
          'Working Paper',
          'Working Papers',
          'Polarizacion'
        ),
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
      facets: { types: [], statuses: [], years: [], tags: [] },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Journal Articles')).toBeVisible()
    await expect.element(screen.getByText('Working Papers')).toBeVisible()
    await expect.element(screen.getByText('Subastas')).toBeVisible()
    await expect.element(screen.getByText('Polarizacion')).toBeVisible()
  })

  it('un tipo partido entre dos paginas repite su rotulo', async () => {
    // La segunda pagina puede empezar con el mismo tipo con el que acabo la anterior.
    // Se abre un apartado nuevo: dejar los trabajos sin rotulo seria peor.
    listResearch.mockResolvedValue({
      items: [
        trabajo(
          'w1',
          'journal_article',
          'Journal Article',
          'Journal Articles',
          'Subastas'
        ),
        trabajo(
          'w2',
          'working_paper',
          'Working Paper',
          'Working Papers',
          'Polarizacion'
        ),
        trabajo(
          'w3',
          'journal_article',
          'Journal Article',
          'Journal Articles',
          'Equivalencia'
        ),
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 3, totalPages: 1 },
      facets: { types: [], statuses: [], years: [], tags: [] },
    })
    const screen = await pintar()

    await expect
      .element(screen.getByText('Journal Articles').first())
      .toBeVisible()
    expect(await screen.getByText('Journal Articles').all()).toHaveLength(2)
  })

  it('no queda ni rastro de la barra de filtros', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Research')).toBeVisible()

    for (const rotulo of ['Publication type', 'Status', 'Topic', 'Sort']) {
      await expect.element(screen.getByText(rotulo)).not.toBeInTheDocument()
    }
    await expect
      .element(screen.getByPlaceholder('Search the archive...'))
      .not.toBeInTheDocument()
  })

  it('sin nada publicado lo explica', async () => {
    const screen = await pintar()
    await expect
      .element(screen.getByText('No work published yet.'))
      .toBeVisible()
  })
})
