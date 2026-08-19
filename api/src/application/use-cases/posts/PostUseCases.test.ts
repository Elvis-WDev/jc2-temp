import { describe, expect, it } from 'vitest'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type { CatalogRepository } from '../../ports/repositories/CatalogRepository.js'
import type { PostRecord, PostRepository } from '../../ports/repositories/PostRepository.js'
import { PostUseCases } from './PostUseCases.js'

const ACTOR = { userId: 'u1', ipAddress: null }
const AHORA = new Date('2026-08-19T10:00:00.000Z')
const SALIO = new Date('2026-03-01T08:00:00.000Z')

function post(parcial: Partial<PostRecord> = {}): PostRecord {
  return {
    id: 'p1',
    kind: 'news',
    title: 'A grant for the department',
    slug: 'a-grant-for-the-department',
    summary: null,
    contentMarkdown: null,
    imageMediaId: null,
    imageAlt: null,
    editorialStatus: 'draft',
    publishedAt: null,
    displayOrder: null,
    files: [],
    ...parcial,
  }
}

function construir(actual: PostRecord = post()) {
  const escrituras: Array<Record<string, unknown>> = []
  const estados: Array<{ estado: string; publishedAt: Date | null }> = []

  const repo: Pick<
    PostRepository,
    'findById' | 'slugExists' | 'create' | 'update' | 'setEditorialStatus' | 'findPublished'
  > = {
    findById: () => Promise.resolve(actual),
    slugExists: () => Promise.resolve(false),
    create: (input) => {
      escrituras.push({ ...input })
      return Promise.resolve({ ...actual, ...input, files: actual.files })
    },
    update: (_id, input) => {
      escrituras.push({ ...input })
      return Promise.resolve({ ...actual, ...input, files: actual.files })
    },
    setEditorialStatus: (_id, estado, publishedAt) => {
      estados.push({ estado, publishedAt })
      return Promise.resolve({ ...actual, editorialStatus: estado, publishedAt })
    },
    findPublished: () => Promise.resolve(null),
  }

  const catalog = {
    list: () => Promise.resolve([{ code: 'news', label: 'News' }]),
  } as unknown as CatalogRepository

  const audit = { record: () => Promise.resolve() } as unknown as AuditLogger

  return {
    casos: new PostUseCases(repo as PostRepository, audit, catalog, () => AHORA),
    escrituras,
    estados,
  }
}

describe('PostUseCases', () => {
  it('deriva el slug del titulo cuando no se envia', async () => {
    const { casos, escrituras } = construir()

    await casos.create({ kind: 'news', title: 'A Grant for the Department' }, ACTOR)

    expect(escrituras[0]?.slug).toBe('a-grant-for-the-department')
  })

  it('no cambia el slug de una entrada publicada aunque cambie el titulo (RN-010)', async () => {
    const { casos, escrituras } = construir(post({ editorialStatus: 'published' }))

    await casos.update('p1', { title: 'Another title entirely' }, ACTOR)

    expect(escrituras[0]?.slug).toBe('a-grant-for-the-department')
  })

  it('regenera el slug mientras la entrada sigue en borrador', async () => {
    const { casos, escrituras } = construir()

    await casos.update('p1', { title: 'Another title entirely' }, ACTOR)

    expect(escrituras[0]?.slug).toBe('another-title-entirely')
  })

  it('archivar conserva la fecha de publicacion', async () => {
    const { casos, estados } = construir(post({ editorialStatus: 'published', publishedAt: SALIO }))

    await casos.archive('p1', ACTOR)

    // Es cuando salio a la web, no cuando se retiro: con `null` se perderia, y con ella
    // el orden del listado si alguna vez se vuelve a publicar.
    expect(estados[0]).toEqual({ estado: 'archived', publishedAt: SALIO })
  })

  it('publicar sella la fecha del reloj inyectado', async () => {
    const { casos, estados } = construir()

    await casos.publish('p1', ACTOR)

    expect(estados[0]).toEqual({ estado: 'published', publishedAt: AHORA })
  })

  it('una entrada que no esta publicada no existe para la web', async () => {
    const { casos } = construir()

    // Mismo error que si no existiera: que este en borrador no es asunto del visitante.
    await expect(casos.getPublished('a-grant-for-the-department')).rejects.toThrow(
      'The entry does not exist.',
    )
  })
})
