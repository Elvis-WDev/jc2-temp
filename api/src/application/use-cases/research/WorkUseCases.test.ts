import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type {
  WorkRecord,
  WorkRepository,
  WorkWriteInput,
} from '../../ports/repositories/WorkRepository.js'
import { WorkUseCases } from './WorkUseCases.js'

const HOY = new Date('2026-08-10T00:00:00Z')

function trabajo(parcial: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: 'w1',
    workTypeId: 'wt1',
    workTypeCode: 'journal_article',
    workTypeLabel: 'Journal Article',
    title: 'Titulo original',
    subtitle: null,
    slug: 'titulo-original',
    abstractMarkdown: null,
    descriptionMarkdown: null,
    academicStatus: 'published',
    academicStatusLabel: 'Publicado',
    academicStatusTone: 'success',
    editorialStatus: 'draft',
    publicationDate: null,
    publicationYear: 2024,
    firstOnlineDate: null,
    venueId: null,
    venueName: null,
    venueAbbreviation: null,
    venueRanking: null,
    publisherName: null,
    volume: null,
    issue: null,
    pages: null,
    articleNumber: null,
    doi: null,
    isbn: null,
    issn: null,
    languageCode: null,
    coverMediaId: null,
    citationTextOverride: null,
    versionLabel: null,
    downloadCode: null,
    bibtexOverride: null,
    isFeatured: false,
    isCarousel: false,
    carouselOrder: null,
    featuredOrder: null,
    displayOrder: null,
    isOpenAccess: false,
    publishedAt: null,
    archivedAt: null,
    authors: [],
    tags: [],
    links: [],
    files: [],
    ...parcial,
  }
}

function construir(
  opciones: { actual?: WorkRecord; autores?: number; slugsOcupados?: string[] } = {},
) {
  const actual = opciones.actual ?? trabajo()
  const escrituras: Array<Partial<WorkWriteInput>> = []
  const estados: Array<{ status: string; extra: unknown }> = []

  const repo = {
    findById: () => Promise.resolve(actual),
    slugExists: (slug: string) => Promise.resolve((opciones.slugsOcupados ?? []).includes(slug)),
    countAuthors: () => Promise.resolve(opciones.autores ?? 0),
    create: (input: WorkWriteInput) => {
      escrituras.push(input)
      return Promise.resolve(trabajo({ slug: input.slug, title: input.title }))
    },
    update: (_id: string, input: Partial<WorkWriteInput>) => {
      escrituras.push(input)
      return Promise.resolve(trabajo({ ...actual, ...input } as Partial<WorkRecord>))
    },
    setEditorialStatus: (_id: string, status: string, extra: unknown) => {
      estados.push({ status, extra })
      return Promise.resolve(trabajo({ editorialStatus: status }))
    },
    setFeatured: (_id: string, isFeatured: boolean) => Promise.resolve(trabajo({ isFeatured })),
    delete: () => Promise.resolve(),
  } as unknown as WorkRepository

  // Se conserva la referencia a la funcion espia en lugar de leerla del objeto:
  // extraer un metodo de su objeto lo desliga de su `this`.
  const record = vi.fn().mockResolvedValue(undefined)
  const audit: AuditLogger = { record }
  return { casos: new WorkUseCases(repo, audit, () => HOY), escrituras, estados, record }
}

const ACTOR = { userId: 'admin-1', ipAddress: null }

describe('RN-002 al publicar', () => {
  it('sin autores devuelve 422 y no cambia el estado', async () => {
    const { casos, estados } = construir({ autores: 0 })

    await expect(casos.publish('w1', ACTOR)).rejects.toMatchObject({
      httpStatus: 422,
      code: 'WORK_VALIDATION_ERROR',
    })
    expect(estados).toHaveLength(0)
  })

  it('con un autor publica y sella publishedAt', async () => {
    const { casos, estados } = construir({ autores: 1 })

    await casos.publish('w1', ACTOR)

    expect(estados[0]).toMatchObject({ status: 'published', extra: { publishedAt: HOY } })
  })

  it('deja registro de auditoria', async () => {
    const { casos, record } = construir({ autores: 1 })
    await casos.publish('w1', ACTOR)

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'publish', entityType: 'works', userId: 'admin-1' }),
    )
  })
})

describe('RN-009 y RN-010 a traves del caso de uso', () => {
  it('normaliza el DOI antes de escribir', async () => {
    const { casos, escrituras } = construir()

    await casos.update('w1', { doi: 'https://doi.org/10.1016/J.Test' }, ACTOR)

    expect(escrituras[0]?.doi).toBe('10.1016/j.test')
  })

  it('un DOI invalido corta antes de tocar el repositorio', async () => {
    const { casos, escrituras } = construir()

    await expect(casos.update('w1', { doi: 'basura' }, ACTOR)).rejects.toMatchObject({
      code: 'WORK_INVALID_DOI',
    })
    expect(escrituras).toHaveLength(0)
  })

  it('cambiar el titulo de un trabajo PUBLICADO no cambia su slug', async () => {
    const { casos, escrituras } = construir({
      actual: trabajo({ editorialStatus: 'published', slug: 'titulo-original' }),
    })

    await casos.update('w1', { title: 'Titulo Corregido' }, ACTOR)

    expect(escrituras[0]?.slug).toBe('titulo-original')
  })

  it('cambiar el titulo de un BORRADOR si actualiza el slug', async () => {
    const { casos, escrituras } = construir()

    await casos.update('w1', { title: 'Titulo Corregido' }, ACTOR)

    expect(escrituras[0]?.slug).toBe('titulo-corregido')
  })

  it('resuelve colisiones de slug con sufijo numerico', async () => {
    const { casos, escrituras } = construir({ slugsOcupados: ['mi-paper', 'mi-paper-2'] })

    await casos.create(
      { workTypeId: 'wt1', title: 'Mi Paper', slug: '', academicStatus: 'published' },
      ACTOR,
    )

    expect(escrituras[0]?.slug).toBe('mi-paper-3')
  })

  it('rechaza un ano fuera de rango sin escribir', async () => {
    const { casos, escrituras } = construir()

    await expect(casos.update('w1', { publicationYear: 2050 }, ACTOR)).rejects.toMatchObject({
      code: 'WORK_INVALID_PUBLICATION_YEAR',
    })
    expect(escrituras).toHaveLength(0)
  })
})

describe('RN-003: destacados', () => {
  it('no se puede destacar un borrador', async () => {
    const { casos } = construir()

    await expect(casos.setFeatured('w1', true, 1)).rejects.toMatchObject({
      code: 'WORK_FEATURED_REQUIRES_PUBLISHED',
    })
  })

  it('archivar retira el trabajo de Home', async () => {
    const { casos, estados } = construir({
      actual: trabajo({ editorialStatus: 'published', isFeatured: true, featuredOrder: 1 }),
    })

    await casos.archive('w1', ACTOR)

    // Dejar is_featured en true sobre algo archivado dejaria RN-003 rota en silencio.
    expect(estados[0]?.extra).toMatchObject({ isFeatured: false, featuredOrder: null })
  })

  it('archivar no menciona la fecha de publicacion, y por eso no la borra', async () => {
    // Un trabajo archiva OMITIENDO el campo: lo que no va en `extra` no llega al UPDATE
    // y la columna se queda como estaba. Los eventos archivan de otra forma —pasan la
    // fecha que ya tenian— y durante un tiempo pasaron `null`, que la borraba. Las dos
    // formas son correctas; lo que no vale es mezclarlas.
    const { casos, estados } = construir({
      actual: trabajo({ editorialStatus: 'published' }),
    })

    await casos.archive('w1', ACTOR)

    expect(Object.keys(estados[0]?.extra as object)).not.toContain('publishedAt')
  })
})
