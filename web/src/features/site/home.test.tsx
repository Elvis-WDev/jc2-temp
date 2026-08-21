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
  latestNews: [
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
  sections: { hero: true, research_areas: true, latest_news: true },
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

// La banda de la imagen solo existe si hay una elegida: sin ella, no se pinta.
const CON_IMAGEN: PublicHome = {
  ...HOME,
  page: { ...PAGINA, heroUrl: '/api/public/media/ilustracion' },
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

  it('la imagen de la portada se pinta centrada en su banda', async () => {
    getHome.mockResolvedValue(CON_IMAGEN)
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    const imagen = document.querySelector(
      'img[src="/api/public/media/ilustracion"]'
    )

    expect(imagen).not.toBeNull()
    expect(imagen?.parentElement?.className).toMatch(/justify-center/)
  })

  it('sin imagen elegida la banda no existe, en vez de una franja vacia', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    expect(document.querySelectorAll('section')).toHaveLength(2)
  })

  it('sin rotulo escrito queda solo la imagen', async () => {
    // Es para lo que se pidio la banda: una imagen, sin encabezado que la anuncie.
    getHome.mockResolvedValue(CON_IMAGEN)
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    const banda = [...document.querySelectorAll('section')][1]

    expect(banda?.querySelector('h2')).toBeNull()
  })

  it('si el titular escribe un rotulo, sale encima', async () => {
    getHome.mockResolvedValue(CON_IMAGEN)
    getSite.mockResolvedValue({
      siteName: 'Sitio',
      meta: { title: null, description: null, ogImageUrl: null },
      pages: { research: true, teaching: true, events: false, blog: true },
      sections: {},
      sectionBackgrounds: {},
      sectionHeadings: {
        'home.image': { title: 'En el laboratorio', aside: null },
      },
    })
    const screen = await pintar()

    await expect.element(screen.getByText('En el laboratorio')).toBeVisible()
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

describe('lo ultimo', () => {
  it('ensena las noticias y lleva a la ficha de cada una', async () => {
    // Sin «See all»: las noticias no tienen listado propio. A cada una se llega por su
    // tarjeta, que es lo unico que enlaza.
    const screen = await pintar()

    await expect
      .element(screen.getByText('Una beca para el departamento'))
      .toBeVisible()
    await expect
      .element(screen.getByRole('link', { name: 'See all' }))
      .not.toBeInTheDocument()
  })

  it('sin noticias no se pinta nada', async () => {
    getHome.mockResolvedValue({ ...HOME, latestNews: [] })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    await expect.element(screen.getByText('News')).not.toBeInTheDocument()
  })
})

/** Con las tres bandas visibles: es donde el turno se puede comprobar entero. */
const HOME_LLENO: PublicHome = {
  ...HOME,
  page: { ...PAGINA, heroUrl: '/api/public/media/ilustracion' },
}

describe('el turno de colores de las bandas', () => {
  // Por la clase y no por el color calculado: en este entorno la hoja del sitio no se
  // carga, asi que `getComputedStyle` devolvia transparente para todas y la comprobacion
  // se cumplia sin comprobar nada. Lo que se fija aqui es el turno; que ese solido se
  // vea como se espera es cosa del barrido en el navegador.
  const bandas = () =>
    [...document.querySelectorAll('section')].map((seccion) => {
      if (seccion.className.includes('bg-site-primary-container'))
        return 'solido'
      // El carrusel de noticias va sobre blanco y fuera del turno: no es el hueso del
      // fondo de la pagina, asi que cuenta como un tercer tono.
      if (seccion.className.includes('bg-site-surface-container-lowest'))
        return 'blanco'
      return 'fondo'
    })

  it('ninguna banda repite el color de la de arriba', async () => {
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    const turno = bandas()
    const repetida = turno.findIndex((c, i) => i > 0 && c === turno[i - 1])

    expect(turno).toHaveLength(3)
    expect({ repetida, turno }).toEqual({ repetida: -1, turno })
  })

  it('el hero se queda con el fondo y la banda de debajo lleva el solido', async () => {
    // Es lo que se pidio. Que la ultima caiga tambien en solido —y toque el pie, que
    // lleva el mismo— lo resuelve el filete del pie, no el color.
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    expect(bandas().slice(0, 3)).toEqual(['fondo', 'solido', 'blanco'])
  })

  it('una banda que no se pinta no gasta su turno', async () => {
    // Sin imagen elegida, esa banda desaparece: las de debajo corren el turno en lugar
    // de quedarse dos seguidas del mismo color.
    getHome.mockResolvedValue({
      ...HOME_LLENO,
      page: { ...PAGINA, heroUrl: null },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    const turno = bandas()
    const repetida = turno.findIndex((c, i) => i > 0 && c === turno[i - 1])

    expect(turno).toHaveLength(2)
    expect({ repetida, turno }).toEqual({ repetida: -1, turno })
  })
})

describe('las noticias, en carrusel', () => {
  it('cierran la portada', async () => {
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    const rotulos = [...document.querySelectorAll('section h2')].map(
      (h) => h.textContent
    )

    expect(rotulos[rotulos.length - 1]).toBe('News')
  })

  it('se pasan con las flechas y no solas', async () => {
    // Un carrusel que gira por su cuenta obliga a leer a la velocidad que decide la
    // web (ERS §41): aqui manda quien lee.
    getHome.mockResolvedValue({
      ...HOME_LLENO,
      latestNews: [
        HOME_LLENO.latestNews[0]!,
        { ...HOME_LLENO.latestNews[0]!, id: 'n2', slug: 'otra' },
      ],
    })
    const screen = await pintar()

    await expect
      .element(screen.getByRole('button', { name: 'Next' }))
      .toBeVisible()
    // En la primera no hay nada anterior a lo que ir.
    await expect
      .element(screen.getByRole('button', { name: 'Previous' }))
      .toBeDisabled()
  })

  it('con una sola noticia no ofrece flechas', async () => {
    // Es una tarjeta grande, no un carrusel de uno.
    getHome.mockResolvedValue(HOME_LLENO)
    const screen = await pintar()
    await expect.element(screen.getByText('News')).toBeVisible()

    await expect
      .element(screen.getByRole('button', { name: 'Next' }))
      .not.toBeInTheDocument()
  })
})

describe('las redes academicas del hero', () => {
  it('salen debajo de los botones, con su enlace', async () => {
    // Se mira el DOM y no la visibilidad: aqui la hoja del sitio no se carga, asi que un
    // enlace cuyo unico contenido es un logotipo que no llega a cargar mide cero.
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    const enlace = document.querySelector('a[aria-label="LinkedIn"]')

    expect(enlace?.getAttribute('href')).toBe('https://linkedin.com/in/x')
    expect(enlace?.getAttribute('rel')).toContain('noopener')
  })

  it('solo el logotipo: ni borde ni rotulo', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    const enlace = document.querySelector('a[aria-label="LinkedIn"]')

    expect(enlace?.textContent).toBe('')
    expect(enlace?.className).not.toMatch(/border/)
  })

  it('un enlace sin logotipo no sale en el hero', async () => {
    // Sin marca no hay nada que ensenar, y un enlace vacio seria un hueco que se puede
    // pulsar. No se pierde: el pie los lista todos por su nombre.
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    expect(document.querySelector('a[aria-label="ORCID"]')).toBeNull()
  })

  it('el logotipo es decorativo: el nombre lo pone el enlace', async () => {
    // Dentro no hay texto que leer, y repetirlo en el `alt` lo anunciaria dos veces.
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    expect(
      document
        .querySelector('a[aria-label="LinkedIn"] img')
        ?.getAttribute('alt')
    ).toBe('')
  })

  it('sin ningun logotipo no deja una fila vacia', async () => {
    getHome.mockResolvedValue({
      ...HOME,
      profile: {
        ...HOME.profile,
        links: HOME.profile.links.map((e) => ({ ...e, iconUrl: null })),
      },
    })
    const screen = await pintar()
    await expect.element(screen.getByText('Juana Castro')).toBeVisible()

    expect(document.querySelector('a[aria-label="LinkedIn"]')).toBeNull()
  })
})
