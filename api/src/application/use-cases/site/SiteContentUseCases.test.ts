import { describe, expect, it } from 'vitest'
import type {
  PageContentRecord,
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
