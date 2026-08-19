import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicHome, type PublicPageContent } from './api'
import { SiteHome } from './home'

const getHome = vi.fn()
const getSite = vi.fn()

// Se reemplaza el modulo entero, no se extiende el real: cargar el original dentro de
// un mock izado deja el modulo a medias y el fallo aparece lejos.
vi.mock('./api', () => ({ getHome: () => getHome(), getSite: () => getSite() }))

// La rejilla de eventos y el encabezado usan `Link`, que fuera de un router no sabe
// donde esta. Se sustituye por un ancla, con `to` como `href`: sin `href` un `<a>` no
// es un enlace para el arbol de accesibilidad, y no se podria comprobar a donde lleva.
vi.mock('@tanstack/react-router', () => ({
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
  pageKey: 'home',
  pageTitle: null,
  eyebrow: null,
  introHtml: null,
  secondaryHtml: null,
  heroUrl: null,
  heroAlt: null,
}

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
    affiliations: [
      {
        title: 'Profesora titular',
        institution: 'Universidad',
        department: 'Departamento de Economia',
        type: 'permanent',
        startDate: '2019-03-01',
        endDate: null,
        isCurrent: true,
      },
      {
        title: 'Investigadora posdoctoral',
        institution: 'Otro centro',
        department: null,
        type: null,
        startDate: '2015-09-01',
        endDate: '2019-02-28',
        isCurrent: false,
      },
    ],
    links: [],
  },
  page: PAGINA,
  latestPosts: {
    news: [
      {
        id: 'n1',
        slug: 'una-beca',
        kind: 'news',
        kindLabel: 'News',
        title: 'Una beca para el departamento',
        summary: 'Cuatro anos.',
        contentHtml: null,
        imageUrl: null,
        imageAlt: null,
        publishedAt: '2026-05-04T00:00:00.000Z',
        files: [],
      },
    ],
    blog: [],
  },
  sections: {
    hero: true,
    about: true,
    research_areas: true,
    appointments: true,
    latest: true,
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
    sectionHeadings: {},
  })
})

// La banda de lineas solo existe si hay texto secundario: sin el, no se pinta.
const CON_LINEAS: PublicHome = {
  ...HOME,
  page: { ...PAGINA, secondaryHtml: '<h3>Diseno de mecanismos</h3>' },
}

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
    // `.first()`: el departamento sale en el antetitulo y otra vez en la trayectoria.
    await expect
      .element(screen.getByText('Departamento de Economia').first())
      .toBeVisible()
  })

  it('con un CV elegido, el hero lo ofrece para descargar', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: { ...HOME.profile, cvUrl: '/api/public/media/abc' },
    })
    const screen = await pintar()

    const boton = screen.getByRole('link', { name: 'CV' })
    await expect.element(boton).toBeVisible()
    await expect.element(boton).toHaveAttribute('href', '/api/public/media/abc')
    // Un CV se guarda, no se hojea: el navegador tiene que descargarlo, y el PDF se
    // sirve `inline`, asi que sin este atributo se abriria en una pestana.
    await expect.element(boton).toHaveAttribute('download')
  })

  it('sin CV elegido, el hero no ensena un boton roto', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByRole('link', { name: 'CV' }))
      .not.toBeInTheDocument()
  })

  it('el hero lleva a Research', async () => {
    const screen = await pintar()

    await expect
      .element(screen.getByRole('link', { name: 'Research' }))
      .toHaveAttribute('href', '/research')
  })

  it('con la pagina de Research apagada, el hero no la ofrece', async () => {
    getSite.mockResolvedValue({
      siteName: 'Sitio',
      meta: { title: null, description: null, ogImageUrl: null },
      pages: {
        research: false,
        teaching: true,
        events: false,
        news: true,
        blog: true,
      },
      sections: {},
      sectionBackgrounds: {},
      sectionHeadings: {},
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByRole('link', { name: 'Research' }))
      .not.toBeInTheDocument()
  })

  it('la banda de lineas de investigacion usa el rotulo de la plantilla', async () => {
    getHome.mockResolvedValue(CON_LINEAS)
    const screen = await pintar()

    await expect.element(screen.getByText('Research lines')).toBeVisible()
    await expect.element(screen.getByText('Main areas')).toBeVisible()
  })

  it('si el titular escribe otro rotulo, manda el suyo', async () => {
    getHome.mockResolvedValue(CON_LINEAS)
    getSite.mockResolvedValue({
      siteName: 'Sitio',
      meta: { title: null, description: null, ogImageUrl: null },
      pages: {
        research: true,
        teaching: true,
        events: false,
        news: true,
        blog: true,
      },
      sections: {},
      sectionBackgrounds: {},
      sectionHeadings: {
        'home.research_areas': { title: 'Lineas de trabajo', aside: 'Temas' },
      },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Lineas de trabajo')).toBeVisible()
    await expect.element(screen.getByText('Temas')).toBeVisible()
    await expect
      .element(screen.getByText('Research lines'))
      .not.toBeInTheDocument()
  })

  it('escrito a medias, el hueco lo rellena la plantilla', async () => {
    getHome.mockResolvedValue(CON_LINEAS)
    getSite.mockResolvedValue({
      siteName: 'Sitio',
      meta: { title: null, description: null, ogImageUrl: null },
      pages: {
        research: true,
        teaching: true,
        events: false,
        news: true,
        blog: true,
      },
      sections: {},
      sectionBackgrounds: {},
      sectionHeadings: {
        'home.research_areas': { title: 'Lineas de trabajo', aside: null },
      },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Lineas de trabajo')).toBeVisible()
    await expect.element(screen.getByText('Main areas')).toBeVisible()
  })

  it('con los textos de la portada ocultos, el resto sigue en pie', async () => {
    // Ocultar la portada en Contenido de paginas quita lo que el titular escribio,
    // no su perfil ni su trayectoria.
    getHome.mockResolvedValue({ ...HOME, page: null })
    const screen = await pintar()

    await expect.element(screen.getByText('Juana Castro')).toBeVisible()
    await expect
      .element(screen.getByText('Profesora titular').first())
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

describe('quien es', () => {
  it('pinta la biografia larga, que hasta ahora no salia en ninguna pagina', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: { ...HOME.profile, fullBioHtml: '<p>Se doctoro en 2015.</p>' },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('Se doctoro en 2015.')).toBeVisible()
  })

  it('sin biografia ni entradilla, la banda no se pinta', async () => {
    // Un encabezado sobre el vacio no informa de nada.
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect.element(screen.getByText('About')).not.toBeInTheDocument()
  })

  it('apagada desde el panel, no aparece aunque haya biografia', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: { ...HOME.profile, fullBioHtml: '<p>Se doctoro en 2015.</p>' },
      sections: { ...HOME.sections, about: false },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByText('Se doctoro en 2015.'))
      .not.toBeInTheDocument()
  })
})

describe('trayectoria', () => {
  it('un cargo vigente se lee «presente», y uno terminado como rango cerrado', async () => {
    // `isCurrent` y no «sin fecha de fin»: un cargo puede seguir vigente sin que nadie
    // sepa cuando acabara, y son dos cosas distintas.
    const screen = await pintar()

    await expect.element(screen.getByText('2019 — Present')).toBeVisible()
    await expect.element(screen.getByText('2015 — 2019')).toBeVisible()
  })

  it('el orden es el que manda el servidor, no el del alfabeto', async () => {
    const screen = await pintar()
    await expect
      .element(screen.getByText('Investigadora posdoctoral'))
      .toBeVisible()

    // Se lee del DOM, no de la lista de la API: lo que importa es que la banda no
    // reordene por su cuenta lo que el servidor ya ordeno.
    const cargos = screen
      .getByRole('heading', { level: 3 })
      .elements()
      .map((el) => el.textContent)

    expect(cargos.slice(0, 2)).toEqual([
      'Profesora titular',
      'Investigadora posdoctoral',
    ])
  })

  it('sin afiliaciones, la banda no se pinta', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: { ...HOME.profile, affiliations: [] },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByText('Appointments'))
      .not.toBeInTheDocument()
  })
})

describe('lo ultimo', () => {
  it('ensena las noticias y lleva a su pagina', async () => {
    const screen = await pintar()

    await expect
      .element(screen.getByText('Una beca para el departamento'))
      .toBeVisible()
    await expect
      .element(screen.getByRole('link', { name: 'See all' }))
      .toHaveAttribute('href', '/news')
  })

  it('el grupo vacio no deja un encabezado suelto', async () => {
    // Blog llega vacio: su banda no existe, en lugar de un titulo sobre nada.
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    await expect.element(screen.getByText('Blog')).not.toBeInTheDocument()
  })

  it('con las dos vacias, no se pinta nada', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      latestPosts: { news: [], blog: [] },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByRole('link', { name: 'See all' }))
      .not.toBeInTheDocument()
  })
})
