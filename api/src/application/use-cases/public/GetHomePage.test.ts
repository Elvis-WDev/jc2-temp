import { describe, expect, it, vi } from 'vitest'
import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PublicResearchUseCases } from '../research/PublicResearchUseCases.js'
import type { PublicTeachingUseCases } from '../teaching/PublicTeachingUseCases.js'
import type { PublicEventUseCases } from '../events/EventUseCases.js'
import type { GetPublicProfile, PublicProfile } from './GetPublicProfile.js'
import { GetHomePage } from './GetHomePage.js'

/**
 * La portada leia sus textos con `getPage`, que es la version del panel y devuelve la
 * pagina este publicada o no. Resultado: ocultar la portada no ocultaba nada.
 */

const PERFIL = { person: { fullName: 'Quien sea' }, primaryAffiliation: null, links: [] }

const AJUSTES = { siteName: 'Sitio', footerText: 'Pie' }

/** Todas encendidas, salvo lo que cada prueba diga. */
const TODAS_VISIBLES = {
  pages: { home: true },
  sections: {
    'home.hero': true,
    'home.carousel': true,
    'home.research_areas': true,
    'home.featured_works': true,
    'home.featured_courses': true,
    'home.events': true,
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
  eventos = {
    list: () => Promise.resolve({ items: [{ id: 'e-1' }], typeLabels: {} }),
  } as unknown as PublicEventUseCases,
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
      {
        listFeatured: () => Promise.resolve([{ id: 'w-1' }]),
        listCarousel: () => Promise.resolve([{ id: 'w-2' }]),
      } as unknown as PublicResearchUseCases,
      { listFeatured: () => Promise.resolve([{ id: 'c-1' }]) } as unknown as PublicTeachingUseCases,
      eventos,
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
    // Lo que se oculta es lo que el titular escribio, no su perfil ni sus destacados.
    const { caso } = portada(false)
    const home = await caso.execute()

    expect(home.profile.person.fullName).toBe('Quien sea')
    expect(home.featuredWorks).toHaveLength(1)
    expect(home.featuredCourses).toHaveLength(1)
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

    expect(home.sections).toMatchObject({ hero: true, featured_works: true })
  })

  it('una seccion apagada no se consulta siquiera', async () => {
    // No es solo que no se pinte: no se va a la base de datos a por ella.
    const { caso } = portada(true, {
      pages: { home: true },
      sections: { ...TODAS_VISIBLES.sections, 'home.featured_works': false },
    })
    const home = await caso.execute()

    expect(home.featuredWorks).toEqual([])
    expect(home.sections.featured_works).toBe(false)
  })

  it('el carrusel es una seleccion aparte de los destacados', async () => {
    const { caso } = portada(true)
    const home = await caso.execute()

    expect(home.carouselWorks.map((w) => w.id)).toEqual(['w-2'])
    expect(home.featuredWorks.map((w) => w.id)).toEqual(['w-1'])
  })

  it('con el carrusel apagado, ni se consulta', async () => {
    const { caso } = portada(true, {
      pages: { home: true },
      sections: { ...TODAS_VISIBLES.sections, 'home.carousel': false },
    })
    const home = await caso.execute()

    expect(home.carouselWorks).toEqual([])
  })

  it('trae los eventos, sin interruptor propio', async () => {
    // La seccion se ensena si hay algo que ensenar: lo que el titular controla es
    // publicar o retirar un evento, no un interruptor mas.
    const { caso } = portada(true)
    const home = await caso.execute()

    expect(home.events).toHaveLength(1)
  })

  it('sin nada por venir, cae en los ultimos celebrados', async () => {
    // Fuera de temporada una seccion en blanco no dice nada, y la historia si.
    const pedidos: Array<boolean | null> = []
    const eventos = {
      list: (_pagina: unknown, filtros: { upcoming: boolean | null }) => {
        pedidos.push(filtros.upcoming)
        return Promise.resolve({
          items: filtros.upcoming === true ? [] : [{ id: 'e-viejo' }],
          typeLabels: {},
        })
      },
    } as unknown as PublicEventUseCases

    const { caso } = portada(true, TODAS_VISIBLES, eventos)
    const home = await caso.execute()

    expect(pedidos).toEqual([true, false])
    expect(home.events).toHaveLength(1)
  })

  it('con proximos, no pregunta por los viejos', async () => {
    const pedidos: Array<boolean | null> = []
    const eventos = {
      list: (_pagina: unknown, filtros: { upcoming: boolean | null }) => {
        pedidos.push(filtros.upcoming)
        return Promise.resolve({ items: [{ id: 'e-proximo' }], typeLabels: {} })
      },
    } as unknown as PublicEventUseCases

    const { caso } = portada(true, TODAS_VISIBLES, eventos)
    await caso.execute()

    expect(pedidos).toEqual([true])
  })
})
