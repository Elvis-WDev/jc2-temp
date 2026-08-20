import { describe, expect, it, vi } from 'vitest'
import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PostUseCases } from '../posts/PostUseCases.js'
import type { GetPublicProfile, PublicProfile } from './GetPublicProfile.js'
import { GetHomePage } from './GetHomePage.js'

/**
 * La portada leia sus textos con `getPage`, que es la version del panel y devuelve la
 * pagina este publicada o no. Resultado: ocultar la portada no ocultaba nada.
 *
 * Desde que la portada habla de la persona y no de su produccion, aqui ya no se prueban
 * destacados, carrusel ni eventos: no viajan.
 */

const PERFIL = {
  person: { fullName: 'Quien sea' },
  primaryAffiliation: null,
  affiliations: [],
  links: [],
}

const AJUSTES = { siteName: 'Sitio', footerText: 'Pie' }

/** Todas encendidas, salvo lo que cada prueba diga. */
const TODAS_VISIBLES = {
  pages: { home: true, news: true, blog: true },
  sections: {
    'home.hero': true,
    'home.research_areas': true,
    'home.latest_news': true,
  },
}

const PAGINA = {
  id: 'p-1',
  pageKey: 'home',
  pageTitle: 'Inicio',
  eyebrow: null,
  introMarkdown: 'Texto de la portada',
  secondaryMarkdown: null,
  heroMediaId: null,
  heroAlt: null,
  isPublished: true,
}

function portada(
  paginaVisible: boolean,
  secciones = TODAS_VISIBLES,
  entradas = {
    listPublished: (_p: unknown, filtros: { kind: string | null }) =>
      Promise.resolve({
        items: [{ id: `post-${filtros.kind ?? 'x'}` }],
        kindLabels: { news: 'News', personal: 'Blog' },
      }),
  } as unknown as PostUseCases,
) {
  // La referencia se guarda aparte: leerla desde el objeto haria que la comprobacion
  // pasara por un metodo desligado de su dueno.
  const findPublishedPage = vi.fn(() => Promise.resolve(paginaVisible ? PAGINA : null))
  const siteContent = {
    getSettings: () => Promise.resolve(AJUSTES),
    getVisibility: () => Promise.resolve(secciones),
    findPublishedPage,
  } as unknown as SiteContentUseCases

  return {
    findPublishedPage,
    caso: new GetHomePage(
      { execute: () => Promise.resolve(PERFIL as unknown as PublicProfile) } as GetPublicProfile,
      siteContent,
      entradas,
    ),
  }
}

describe('portada publica', () => {
  it('con la pagina visible, devuelve sus textos', async () => {
    const { caso } = portada(true)
    await expect(caso.execute()).resolves.toMatchObject({
      page: { introMarkdown: 'Texto de la portada' },
    })
  })

  it('con la pagina oculta, no devuelve sus textos', async () => {
    const { caso } = portada(false)
    const home = await caso.execute()

    expect(home.page).toBeNull()
  })

  it('pero ocultar los textos no vacia la portada entera', async () => {
    // Lo que se oculta es lo que el titular escribio, no su perfil ni sus noticias.
    const { caso } = portada(false)
    const home = await caso.execute()

    expect(home.profile.person.fullName).toBe('Quien sea')
    expect(home.latestNews).toHaveLength(1)
  })

  it('lee la pagina con la version publica, nunca con la del panel', async () => {
    // Si alguien vuelve a `getPage`, esta prueba lo caza: es el error original.
    const { caso, findPublishedPage } = portada(true)
    await caso.execute()

    expect(findPublishedPage).toHaveBeenCalledWith('home')
  })

  it('devuelve que secciones se pintan, ya resueltas', async () => {
    const { caso } = portada(true)
    const home = await caso.execute()

    expect(home.sections).toMatchObject({ hero: true, research_areas: true })
  })

  it('una seccion apagada no se consulta siquiera', async () => {
    // No es solo que no se pinte: no se va a la base de datos a por ella.
    const { caso } = portada(true, {
      pages: TODAS_VISIBLES.pages,
      sections: { ...TODAS_VISIBLES.sections, 'home.latest_news': false },
    })
    const home = await caso.execute()

    expect(home.latestNews).toEqual([])
    expect(home.sections.latest_news).toBe(false)
  })
})

describe('lo ultimo de noticias', () => {
  it('trae las noticias para el carrusel', async () => {
    const { caso } = portada(true)
    const home = await caso.execute()

    expect(home.latestNews.map((p) => p.id)).toEqual(['post-news'])
  })

  it('apagar la pagina de News la retira tambien de la portada', async () => {
    // Enlazar desde aqui a una seccion que el menu no ensena llevaria a un 404.
    const { caso } = portada(true, {
      pages: { home: true, news: false, blog: true },
      sections: TODAS_VISIBLES.sections,
    })
    const home = await caso.execute()

    expect(home.latestNews).toEqual([])
  })
})
