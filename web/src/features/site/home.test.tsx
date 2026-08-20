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
    links: [
      {
        type: 'orcid',
        label: 'ORCID',
        url: 'https://orcid.org/x',
        iconUrl: null,
      },
      {
        type: 'linkedin',
        label: 'LinkedIn',
        url: 'https://linkedin.com/in/x',
        iconUrl: '/api/public/media/logo',
      },
    ],
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

/** Con las seis bandas visibles: es donde el turno se puede comprobar entero. */
const HOME_LLENO: PublicHome = {
  ...HOME,
  profile: { ...HOME.profile, fullBioHtml: '<p>Se doctoro en 2015.</p>' },
  page: { ...PAGINA, secondaryHtml: '<h3>Diseno de mecanismos</h3>' },
  latestPosts: {
    news: HOME.latestPosts.news,
    blog: [{ ...HOME.latestPosts.news[0]!, id: 'b1', slug: 'una-entrada' }],
  },
}

describe('el turno de colores de las bandas', () => {
  // Por la clase y no por el color calculado: en este entorno la hoja del sitio no se
  // carga, asi que `getComputedStyle` devolvia transparente para todas y la comprobacion
  // se cumplia sin comprobar nada. Lo que se fija aqui es el turno; que ese solido se
  // vea como se espera es cosa del barrido en el navegador.
  const SOLIDO = 'bg-site-primary-container'
  const bandas = () =>
    [...document.querySelectorAll('section')].map((seccion) =>
      seccion.className.includes(SOLIDO) ? 'solido' : 'fondo'
    )

  it('ninguna banda repite el color de la de arriba', async () => {
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('Appointments')).toBeVisible()

    const turno = bandas()
    const repetida = turno.findIndex((c, i) => i > 0 && c === turno[i - 1])

    expect(turno).toHaveLength(6)
    expect({ repetida, turno }).toEqual({ repetida: -1, turno })
  })

  it('el hero se queda con el fondo y la banda de debajo lleva el solido', async () => {
    // Es lo que se pidio. Que la ultima caiga tambien en solido —y toque el pie, que
    // lleva el mismo— lo resuelve el filete del pie, no el color.
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('Appointments')).toBeVisible()

    expect(bandas().slice(0, 3)).toEqual(['fondo', 'solido', 'fondo'])
  })

  it('una banda que no se pinta no gasta su turno', async () => {
    // Sin trayectoria, la banda desaparece: las de debajo corren el turno en lugar de
    // quedarse dos seguidas del mismo color.
    getHome.mockResolvedValue({
      ...HOME_LLENO,
      profile: { ...HOME_LLENO.profile, affiliations: [] },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    const turno = bandas()
    const repetida = turno.findIndex((c, i) => i > 0 && c === turno[i - 1])

    expect(turno).toHaveLength(5)
    expect({ repetida, turno }).toEqual({ repetida: -1, turno })
  })
})

describe('las noticias, en carrusel', () => {
  it('cierran la portada, debajo del blog', async () => {
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    const rotulos = [...document.querySelectorAll('section h2')].map(
      (h) => h.textContent
    )

    expect(rotulos[rotulos.length - 1]).toBe('News')
    expect(rotulos.indexOf('Blog')).toBeLessThan(rotulos.indexOf('News'))
  })

  it('se pasan con las flechas y no solas', async () => {
    // Un carrusel que gira por su cuenta obliga a leer a la velocidad que decide la
    // web (ERS §41): aqui manda quien lee.
    getHome.mockResolvedValue({
      ...HOME_LLENO,
      latestPosts: {
        ...HOME_LLENO.latestPosts,
        news: [
          HOME_LLENO.latestPosts.news[0]!,
          { ...HOME_LLENO.latestPosts.news[0]!, id: 'n2', slug: 'otra' },
        ],
      },
    })
    const screen = await pintar()

    await expect
      .element(screen.getByRole('button', { name: 'Siguiente' }))
      .toBeVisible()
    // En la primera no hay nada anterior a lo que ir.
    await expect
      .element(screen.getByRole('button', { name: 'Anterior' }))
      .toBeDisabled()
  })

  it('con una sola noticia no ofrece flechas', async () => {
    // Es una tarjeta grande, no un carrusel de uno.
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    await expect
      .element(screen.getByRole('button', { name: 'Siguiente' }))
      .not.toBeInTheDocument()
  })

  it('el blog se queda en lista', async () => {
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('Blog')).toBeVisible()

    const carruseles = document.querySelectorAll(
      '[aria-roledescription="carousel"]'
    )

    expect(carruseles).toHaveLength(1)
    expect(carruseles[0]?.getAttribute('aria-label')).toBe('News')
  })
})

describe('las redes academicas del hero', () => {
  it('salen debajo de los botones, con su enlace', async () => {
    // Se mira el DOM y no la visibilidad: aqui la hoja del sitio no se carga, asi que un
    // enlace cuyo unico contenido es un logotipo que no llega a cargar mide cero.
    const screen = await pintar()
    await expect
      .element(screen.getByRole('link', { name: 'ORCID' }))
      .toBeVisible()

    const enlace = document.querySelector('a[aria-label="LinkedIn"]')

    expect(enlace?.getAttribute('href')).toBe('https://linkedin.com/in/x')
    expect(enlace?.getAttribute('rel')).toContain('noopener')
  })

  it('con logotipo ensena la marca, sin el ensena el rotulo', async () => {
    // Asi el enlace se puede poner desde el primer dia y subir la marca despues, en
    // lugar de un hueco roto mientras tanto.
    const screen = await pintar()
    await expect
      .element(screen.getByRole('link', { name: 'ORCID' }))
      .toBeVisible()

    const conLogo = document.querySelector('a[aria-label="LinkedIn"] img')
    const sinLogo = document.querySelector('a[aria-label="ORCID"] img')

    expect(conLogo?.getAttribute('src')).toBe('/api/public/media/logo')
    expect(sinLogo).toBeNull()
  })

  it('el logotipo es decorativo: el nombre lo pone el enlace', async () => {
    // Dentro no hay texto que leer, y repetirlo en el `alt` lo anunciaria dos veces.
    const screen = await pintar()
    await expect
      .element(screen.getByRole('link', { name: 'ORCID' }))
      .toBeVisible()

    expect(
      document
        .querySelector('a[aria-label="LinkedIn"] img')
        ?.getAttribute('alt')
    ).toBe('')
  })

  it('sin enlaces no deja una fila vacia', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: { ...HOME.profile, links: [] },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect
      .element(screen.getByRole('link', { name: 'ORCID' }))
      .not.toBeInTheDocument()
  })
})
