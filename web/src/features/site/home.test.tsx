import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicHome } from './api'
import { SiteHome } from './home'

const getHome = vi.fn()
const getSite = vi.fn()

// Se reemplaza el modulo entero, no se extiende el real: cargar el original dentro de
// un mock izado deja el modulo a medias y el fallo aparece lejos.
vi.mock('./api', () => ({ getHome: () => getHome(), getSite: () => getSite() }))

// La rejilla de eventos y el encabezado usan `Link`, que fuera de un router no sabe
// donde esta. Se sustituye por un ancla.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const HOME: PublicHome = {
  profile: {
    fullName: 'Juana Castro',
    preferredName: null,
    professionalTitle: 'Profesora titular',
    currentPosition: null,
    shortBio: 'Estudia mercados y politica publica.',
    fullBioHtml: null,
    researchStatementHtml: null,
    publicEmail: 'juana@ejemplo.edu',
    city: null,
    countryCode: null,
    photoUrl: null,
    cvUrl: null,
    orcid: '0000-0002-1825-0097',
    scholarUrls: {
      googleScholar: 'https://scholar.google.com/citations?user=x',
      scopus: null,
      ssrn: null,
      repec: null,
      website: null,
    },
    primaryAffiliation: {
      title: 'Profesora titular',
      institution: 'Universidad',
      department: 'Departamento de Economia',
    },
    links: [],
  },
  page: {
    pageKey: 'home',
    pageTitle: null,
    eyebrow: null,
    introHtml: null,
    secondaryHtml: null,
    heroUrl: null,
    heroAlt: null,
  },
  carouselWorks: [],
  featuredWorks: [
    {
      id: 'w1',
      slug: 'mercados',
      title: 'Friccion informativa en mercados',
      subtitle: null,
      type: { code: 'article', label: 'Articulo' },
      academicStatus: 'published',
      academicStatusLabel: 'Publicado',
      year: 2024,
      venue: 'Revista de Economia',
      venueAbbreviation: null,
      venueRanking: null,
      doi: null,
      doiUrl: null,
      isOpenAccess: false,
      authors: ['Juana Castro', 'Ana Soto'],
      tags: [],
      volume: null,
      issue: null,
      pdfUrl: null,
    },
  ],
  featuredCourses: [],
  events: [],
  sections: {
    hero: true,
    carousel: true,
    research_areas: true,
    featured_works: true,
    featured_courses: true,
    events: true,
  },
}

function pintar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SiteHome />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getHome.mockResolvedValue(HOME)
  getSite.mockResolvedValue({
    siteName: 'Sitio',
    meta: { title: null, description: null, ogImageUrl: null },
    pages: { research: true, teaching: true, events: false },
    sections: {},
    sectionBackgrounds: {},
  })
})

describe('portada publica', () => {
  it('muestra el perfil que devuelve la API', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Juana Castro')).toBeVisible()
    await expect
      .element(screen.getByText('Estudia mercados y politica publica.'))
      .toBeVisible()
  })

  it('sin antetitulo escrito usa el departamento de la afiliacion principal', async () => {
    const screen = await pintar()
    await expect
      .element(screen.getByText('Departamento de Economia'))
      .toBeVisible()
  })

  it('descuenta al titular de la lista de coautores', async () => {
    const screen = await pintar()

    // "Juana Castro y Ana Soto" seria raro en la web de Juana Castro.
    await expect.element(screen.getByText('with Ana Soto')).toBeVisible()
  })

  it('un trabajo en solitario no dice "con"', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      featuredWorks: [{ ...HOME.featuredWorks[0], authors: ['Juana Castro'] }],
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Sole author')).toBeVisible()
  })

  it('si el titular apaga los destacados, la seccion no aparece', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      sections: { ...HOME.sections, featured_works: false },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Juana Castro')).toBeVisible()
    await expect
      .element(screen.getByText('Selected publications'))
      .not.toBeInTheDocument()
  })

  it('encendida pero sin nada dentro, explica el vacio en vez de dejarlo en blanco', async () => {
    getHome.mockResolvedValue({ ...HOME, featuredWorks: [] })
    const screen = await pintar()

    // ERS §55: no mostrar una seccion vacia sin explicacion.
    await expect
      .element(screen.getByText('No featured work yet.'))
      .toBeVisible()
  })

  it('sin eventos publicados, la rejilla no se pinta', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByText(/Upcoming events|Past events/))
      .not.toBeInTheDocument()
  })

  it('con eventos pasados, el titulo lo dice', async () => {
    // Si la API cae en los ultimos celebrados, llamarlos "proximos" seria mentir.
    getHome.mockResolvedValue({
      ...HOME,
      events: [
        {
          id: 'e1',
          slug: 'seminario-viejo',
          title: 'Seminario del ano pasado',
          type: 'seminar',
          typeLabel: 'Seminario',
          summary: null,
          contentHtml: null,
          startsAt: '2020-03-12T10:00:00.000Z',
          endsAt: null,
          location: 'Aula Magna',
          organizer: null,
          imageUrl: null,
          imageAlt: null,
          button: null,
          isMain: false,
          institutions: [],
        },
      ],
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Past events')).toBeVisible()
    await expect
      .element(screen.getByText('Seminario del ano pasado'))
      .toBeVisible()
  })

  it('con los textos de la portada ocultos, el resto sigue en pie', async () => {
    // Ocultar la portada en Contenido de paginas quita lo que el titular escribio,
    // no su perfil ni sus destacados.
    getHome.mockResolvedValue({ ...HOME, page: null })
    const screen = await pintar()

    await expect.element(screen.getByText('Juana Castro')).toBeVisible()
    await expect
      .element(screen.getByText('Friccion informativa en mercados'))
      .toBeVisible()
  })

  it('si la API falla, lo dice en vez de quedarse en blanco', async () => {
    getHome.mockRejectedValue(new Error('caida'))
    const screen = await pintar()

    await expect
      .element(screen.getByText(/The content could not be loaded/))
      .toBeVisible()
  })
})
