import { describe, expect, it } from 'vitest'
import {
  assertCourseCanBeFeatured,
  assertMaterialSourceIsExclusive,
  assertOfferingCanBePublished,
} from './rules.js'

describe('RN-005: publicar una edicion', () => {
  it('permite publicar si el curso esta publicado', () => {
    expect(() => {
      assertOfferingCanBePublished({ courseEditorialStatus: 'published' })
    }).not.toThrow()
  })

  it('rechaza si el curso esta archivado', () => {
    expect(() => assertOfferingCanBePublished({ courseEditorialStatus: 'archived' })).toThrowError(
      expect.objectContaining({ httpStatus: 422, code: 'OFFERING_COURSE_ARCHIVED' }),
    )
  })

  it('rechaza tambien si el curso sigue en borrador, con otro codigo', () => {
    // Son situaciones distintas y la accion correctora tambien: restaurar frente a
    // publicar. Un unico codigo obligaria al frontend a adivinar.
    expect(() => assertOfferingCanBePublished({ courseEditorialStatus: 'draft' })).toThrowError(
      expect.objectContaining({ code: 'OFFERING_COURSE_NOT_PUBLISHED' }),
    )
  })
})

describe('RN-004: destacar un curso', () => {
  it('solo se destaca lo publicado', () => {
    expect(() => {
      assertCourseCanBeFeatured({ editorialStatus: 'published' })
    }).not.toThrow()
    expect(() => assertCourseCanBeFeatured({ editorialStatus: 'draft' })).toThrowError(
      expect.objectContaining({ code: 'COURSE_FEATURED_REQUIRES_PUBLISHED' }),
    )
  })
})

describe('ERS §24: XOR de la fuente del material', () => {
  it('acepta solo archivo', () => {
    expect(() => {
      assertMaterialSourceIsExclusive({ mediaId: 'm1', externalUrl: null })
    }).not.toThrow()
  })

  it('acepta solo enlace', () => {
    expect(() => {
      assertMaterialSourceIsExclusive({ mediaId: null, externalUrl: 'https://x.test/s.pdf' })
    }).not.toThrow()
  })

  it('rechaza los dos a la vez', () => {
    expect(() =>
      assertMaterialSourceIsExclusive({ mediaId: 'm1', externalUrl: 'https://x.test/s.pdf' }),
    ).toThrowError(expect.objectContaining({ code: 'MATERIAL_SOURCE_CONFLICT' }))
  })

  it('rechaza ninguno de los dos', () => {
    expect(() =>
      assertMaterialSourceIsExclusive({ mediaId: null, externalUrl: null }),
    ).toThrowError(expect.objectContaining({ code: 'MATERIAL_SOURCE_MISSING' }))
  })

  it('una cadena vacia no cuenta como enlace', () => {
    expect(() => assertMaterialSourceIsExclusive({ mediaId: null, externalUrl: '' })).toThrowError(
      expect.objectContaining({ code: 'MATERIAL_SOURCE_MISSING' }),
    )
  })
})
