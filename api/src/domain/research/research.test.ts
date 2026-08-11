import { describe, expect, it } from 'vitest'
import { buildBibtex, buildCitationText, type CitationSource } from './Citation.js'
import { doiToUrl, normalizeDoi } from './Doi.js'
import { generateSlug, resolveSlugOnUpdate, withSuffix } from './Slug.js'
import {
  assertAuthorOrderIsContiguous,
  assertCanBeFeatured,
  assertCanBePublished,
  assertPublicationYearInRange,
} from './WorkRules.js'

describe('RN-009: normalizacion del DOI', () => {
  it.each([
    ['https://doi.org/10.1016/j.x', '10.1016/j.x'],
    ['http://dx.doi.org/10.1016/j.x', '10.1016/j.x'],
    ['doi:10.1016/j.x', '10.1016/j.x'],
    ['DOI:10.1016/j.x', '10.1016/j.x'],
    ['10.1016/j.x', '10.1016/j.x'],
    ['  10.1016/j.x  ', '10.1016/j.x'],
  ])('%s se persiste como %s', (entrada, esperado) => {
    expect(normalizeDoi(entrada)).toBe(esperado)
  })

  it('normaliza a minusculas para que no haya duplicados por capitalizacion', () => {
    expect(normalizeDoi('10.1016/J.Example')).toBe('10.1016/j.example')
  })

  it('trata la cadena vacia como ausencia de DOI', () => {
    expect(normalizeDoi('')).toBeNull()
    expect(normalizeDoi(null)).toBeNull()
    expect(normalizeDoi(undefined)).toBeNull()
  })

  it.each(['no-es-un-doi', '10.1/x', 'https://example.com/paper', '10.1016'])(
    'rechaza %s',
    (entrada) => {
      expect(() => normalizeDoi(entrada)).toThrowError(
        expect.objectContaining({ code: 'WORK_INVALID_DOI' }),
      )
    },
  )

  it('reconstruye la URL canonica desde el valor normalizado', () => {
    expect(doiToUrl('10.1016/j.x')).toBe('https://doi.org/10.1016/j.x')
  })
})

describe('RN-010: estabilidad del slug', () => {
  it('genera un slug legible desde el titulo', () => {
    expect(generateSlug('Revenue Equivalence in Dynamic Auctions')).toBe(
      'revenue-equivalence-in-dynamic-auctions',
    )
  })

  it('resuelve colisiones con un sufijo numerico', () => {
    expect(withSuffix('mi-titulo', 1)).toBe('mi-titulo')
    expect(withSuffix('mi-titulo', 3)).toBe('mi-titulo-3')
  })

  it('NO cambia el slug de un trabajo publicado aunque cambie el titulo', () => {
    // El slug publicado puede estar en un enlace externo o en una cita.
    expect(
      resolveSlugOnUpdate({
        slugActual: 'titulo-original',
        tituloNuevo: 'Titulo Corregido',
        yaPublicado: true,
      }),
    ).toBe('titulo-original')
  })

  it('si sigue en borrador, el slug acompana al titulo', () => {
    expect(
      resolveSlugOnUpdate({
        slugActual: 'titulo-original',
        tituloNuevo: 'Titulo Corregido',
        yaPublicado: false,
      }),
    ).toBe('titulo-corregido')
  })

  it('un slug pedido explicitamente gana, incluso si esta publicado', () => {
    expect(
      resolveSlugOnUpdate({
        slugActual: 'titulo-original',
        slugSolicitado: 'Slug Elegido A Mano',
        yaPublicado: true,
      }),
    ).toBe('slug-elegido-a-mano')
  })
})

describe('RN-002 y RN-003: invariantes de publicacion', () => {
  it('publicar sin autores devuelve 422', () => {
    expect(() => {
      assertCanBePublished({ authorCount: 0 })
    }).toThrowError(expect.objectContaining({ httpStatus: 422, code: 'WORK_VALIDATION_ERROR' }))
  })

  it('publicar con un autor pasa', () => {
    expect(() => {
      assertCanBePublished({ authorCount: 1 })
    }).not.toThrow()
  })

  it('destacar un borrador devuelve 422', () => {
    expect(() => {
      assertCanBeFeatured({ editorialStatus: 'draft' })
    }).toThrowError(expect.objectContaining({ code: 'WORK_FEATURED_REQUIRES_PUBLISHED' }))
  })

  it('destacar un trabajo publicado pasa', () => {
    expect(() => {
      assertCanBeFeatured({ editorialStatus: 'published' })
    }).not.toThrow()
  })

  it('el orden de autoria debe ser 1..N sin huecos', () => {
    expect(() => {
      assertAuthorOrderIsContiguous([1, 2, 3])
    }).not.toThrow()
    expect(() => {
      assertAuthorOrderIsContiguous([1, 3])
    }).toThrowError(expect.objectContaining({ code: 'WORK_INVALID_AUTHOR_ORDER' }))
    expect(() => {
      assertAuthorOrderIsContiguous([0, 1])
    }).toThrow()
  })
})

describe('rango del ano de publicacion (ERS §15)', () => {
  const HOY = new Date('2026-08-10T00:00:00Z')

  it('acepta un ano historico y uno hasta cinco anos por delante', () => {
    expect(() => {
      assertPublicationYearInRange(1850, HOY)
    }).not.toThrow()
    expect(() => {
      assertPublicationYearInRange(2031, HOY)
    }).not.toThrow()
  })

  it('rechaza anterior a 1800 y mas de cinco anos por delante', () => {
    expect(() => {
      assertPublicationYearInRange(1799, HOY)
    }).toThrow()
    expect(() => {
      assertPublicationYearInRange(2032, HOY)
    }).toThrow()
  })
})

const FUENTE: CitationSource = {
  title: 'Revenue Equivalence in Dynamic Auctions',
  subtitle: null,
  authors: [
    { fullName: 'Juan Carlos Carbajal', givenName: 'Juan Carlos', familyName: 'Carbajal' },
    { fullName: 'Rudolf Muller', givenName: 'Rudolf', familyName: 'Muller' },
  ],
  publicationYear: 2024,
  venueName: 'Journal of Economic Theory',
  publisherName: null,
  volume: '215',
  issue: '3',
  pages: '120-141',
  doi: '10.1016/j.jet.2024.01.001',
  isbn: null,
  workTypeCode: 'journal_article',
  citationTextOverride: null,
  bibtexOverride: null,
}

describe('RF-010: cita y BibTeX', () => {
  it('genera una cita con autores, ano, titulo, sede y DOI', () => {
    const cita = buildCitationText(FUENTE)

    expect(cita).toContain('Carbajal, J. C., & Muller, R.')
    expect(cita).toContain('(2024)')
    expect(cita).toContain('Journal of Economic Theory, 215(3), 120-141')
    expect(cita).toContain('https://doi.org/10.1016/j.jet.2024.01.001')
  })

  it('usa n.d. cuando no hay ano', () => {
    expect(buildCitationText({ ...FUENTE, publicationYear: null })).toContain('(n.d.)')
  })

  it('el override manual tiene prioridad sobre la generacion', () => {
    expect(buildCitationText({ ...FUENTE, citationTextOverride: 'Mi cita a medida.' })).toBe(
      'Mi cita a medida.',
    )
  })

  it('genera BibTeX de tipo article para un journal article', () => {
    const bibtex = buildBibtex(FUENTE)

    expect(bibtex.startsWith('@article{carbajal2024revenue,')).toBe(true)
    expect(bibtex).toContain('author = {Carbajal, Juan Carlos and Muller, Rudolf}')
    expect(bibtex).toContain('journal = {Journal of Economic Theory}')
    // BibTeX usa doble guion en el rango de paginas.
    expect(bibtex).toContain('pages = {120--141}')
  })

  it('mapea el tipo de trabajo al tipo de entrada BibTeX', () => {
    expect(buildBibtex({ ...FUENTE, workTypeCode: 'book' })).toContain('@book{')
    expect(buildBibtex({ ...FUENTE, workTypeCode: 'book_chapter' })).toContain('@incollection{')
    expect(buildBibtex({ ...FUENTE, workTypeCode: 'working_paper' })).toContain('@techreport{')
    expect(buildBibtex({ ...FUENTE, workTypeCode: 'dataset' })).toContain('@misc{')
  })

  it('omite los campos vacios en lugar de dejarlos en blanco', () => {
    const bibtex = buildBibtex({ ...FUENTE, volume: null, issue: null, doi: null })

    expect(bibtex).not.toContain('volume')
    expect(bibtex).not.toContain('doi')
  })

  it('el override manual tiene prioridad', () => {
    expect(buildBibtex({ ...FUENTE, bibtexOverride: '@misc{mio}' })).toBe('@misc{mio}')
  })
})
