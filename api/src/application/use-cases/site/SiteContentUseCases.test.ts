import { describe, expect, it } from 'vitest'
import type {
  PageContentRecord,
  PageSectionInput,
  PageSectionRecord,
  SiteContentRepository,
} from '../../ports/repositories/SiteContentRepository.js'
import { SiteContentUseCases } from './SiteContentUseCases.js'

/**
 * El interruptor "visible en la web" de una pagina no hacia nada: la ruta publica
 * servia el contenido igual. Comprobado contra la base de datos antes de corregirlo.
 */

const PAGINA: PageContentRecord = {
  id: 'p-1',
  pageKey: 'research',
  pageTitle: 'Research',
  eyebrow: null,
  introMarkdown: null,
  secondaryMarkdown: null,
  heroMediaId: null,
  heroAlt: null,
  isPublished: true,
}

function casos(pagina: PageContentRecord) {
  return new SiteContentUseCases({
    findPage: () => Promise.resolve(pagina),
  } as unknown as SiteContentRepository)
}

describe('una pagina para la web publica', () => {
  it('se sirve si esta visible', async () => {
    await expect(casos(PAGINA).getPublishedPage('research')).resolves.toMatchObject({
      pageKey: 'research',
    })
  })

  it('no se sirve si esta oculta, ni sabiendo su direccion', async () => {
    await expect(
      casos({ ...PAGINA, isPublished: false }).getPublishedPage('research'),
    ).rejects.toMatchObject({ httpStatus: 404, code: 'PAGE_CONTENT_NOT_FOUND' })
  })
})

describe('la misma pagina para el panel', () => {
  it('se lee aunque este oculta: es lo que se edita antes de publicarla', async () => {
    await expect(
      casos({ ...PAGINA, isPublished: false }).getPage('research'),
    ).resolves.toMatchObject({ isPublished: false })
  })
})

// --- Rotulo editable de una banda -------------------------------------------

const SECCION: PageSectionRecord = {
  id: 's-1',
  pageKey: 'research',
  sectionKey: 'image',
  isVisible: true,
  heading: null,
  headingAside: null,
  backgroundMediaId: null,
  backgroundOverlay: 45,
  sortOrder: 0,
}

function conSecciones(secciones: PageSectionRecord[]) {
  return new SiteContentUseCases({
    listPages: () => Promise.resolve([{ ...PAGINA, pageKey: 'home', isPublished: true }]),
    listSections: () => Promise.resolve(secciones),
  } as unknown as SiteContentRepository)
}

describe('el rotulo de una banda', () => {
  it('viaja a la web cuando el titular lo ha escrito', async () => {
    const { headings } = await conSecciones([
      { ...SECCION, pageKey: 'home', heading: 'Lineas de trabajo', headingAside: 'Areas' },
    ]).getVisibility()

    expect(headings['home.image']).toEqual({
      title: 'Lineas de trabajo',
      aside: 'Areas',
    })
  })

  it('sin escribir no viaja: la banda usa el de la plantilla', async () => {
    const { headings } = await conSecciones([{ ...SECCION, pageKey: 'home' }]).getVisibility()

    expect(headings).toEqual({})
  })

  it('escrito a medias viaja igual, con el hueco a null', async () => {
    const { headings } = await conSecciones([
      { ...SECCION, pageKey: 'home', heading: 'Solo el titulo' },
    ]).getVisibility()

    expect(headings['home.image']).toEqual({ title: 'Solo el titulo', aside: null })
  })

  it('borrarlo devuelve el de la plantilla, no un hueco en blanco', async () => {
    let guardado: PageSectionInput | null = null
    const casos = new SiteContentUseCases({
      updateSection: (_id: string, input: PageSectionInput) => {
        guardado = input
        return Promise.resolve(SECCION)
      },
    } as unknown as SiteContentRepository)

    // Un formulario vacio manda '', no null: si se guardara tal cual, la banda
    // quedaria sin rotulo en vez de recuperar el suyo.
    await casos.updateSection('s-1', { heading: '   ', headingAside: '' })

    expect(guardado).toEqual({ heading: null, headingAside: null })
  })

  it('recorta los espacios de alrededor', async () => {
    let guardado: PageSectionInput | null = null
    const casos = new SiteContentUseCases({
      updateSection: (_id: string, input: PageSectionInput) => {
        guardado = input
        return Promise.resolve(SECCION)
      },
    } as unknown as SiteContentRepository)

    await casos.updateSection('s-1', { heading: '  Lineas de trabajo  ' })

    expect(guardado).toEqual({ heading: 'Lineas de trabajo' })
  })
})

describe('la visibilidad que ve la web', () => {
  it('no anuncia secciones que el codigo ya no dibuja', async () => {
    const casos = new SiteContentUseCases({
      listPages: () => Promise.resolve([{ ...PAGINA, pageKey: 'research', isPublished: true }]),
      listSections: () =>
        Promise.resolve([
          { ...SECCION, sectionKey: 'header' },
          // Sobrante de cuando Research tenia barra de filtros. Anunciarla haria creer a
          // quien lea la API publica que esa seccion sigue existiendo.
          { ...SECCION, sectionKey: 'filters', backgroundMediaId: 'm-1', heading: 'Filtros' },
        ]),
    } as unknown as SiteContentRepository)

    const { sections, backgrounds, headings } = await casos.getVisibility()

    expect(Object.keys(sections)).toEqual(['research.header'])
    expect(backgrounds['research.filters']).toBeUndefined()
    expect(headings['research.filters']).toBeUndefined()
  })
})

describe('las secciones que ve el panel', () => {
  it('no incluye las que el codigo ya no dibuja', async () => {
    const casos = new SiteContentUseCases({
      listSections: () =>
        Promise.resolve([
          { ...SECCION, sectionKey: 'header' },
          // Quedo de cuando Research tenia barra de filtros. Su interruptor no
          // encenderia nada, asi que no se ofrece.
          { ...SECCION, sectionKey: 'filters' },
        ]),
    } as unknown as SiteContentRepository)

    const secciones = await casos.listSections('research')

    expect(secciones.map((seccion) => seccion.sectionKey)).toEqual(['header'])
  })
})
