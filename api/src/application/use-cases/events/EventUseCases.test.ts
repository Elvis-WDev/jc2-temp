import { describe, expect, it } from 'vitest'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type { EventRecord, EventRepository } from '../../ports/repositories/EventRepository.js'
import { EventUseCases } from './EventUseCases.js'

/**
 * Lo que se guarda de un evento al cambiar de estado.
 *
 * La prueba de abajo existe porque `archive` pasaba `null` como fecha de publicacion
 * mientras el comentario de encima decia lo contrario. Se veia en marcha: un evento con
 * `2026-08-19T14:57:40.044Z` volvia con `null`, y volver a publicarlo sellaba la fecha de
 * ese momento, asi que la original **no se recuperaba**.
 *
 * Aqui se prueban tambien works y courses aunque nunca han fallado: los tres archivan
 * distinto —eventos pasan la fecha, los otros dos omiten el campo— y sin dejar constancia
 * de que las tres formas son correctas, el siguiente que pase a «unificarlas» tiene
 * bastantes papeletas de unificarlas hacia el lado equivocado.
 */

const ACTOR = { userId: 'u1', ipAddress: null }
const AHORA = new Date('2026-08-21T10:00:00.000Z')
const SALIO = new Date('2026-03-01T08:00:00.000Z')

function evento(parcial: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: '2026 Economic Theory Festival',
    slug: '2026-economic-theory-festival',
    eventType: null,
    summary: null,
    contentMarkdown: null,
    startsAt: new Date('2026-12-15T09:00:00.000Z'),
    endsAt: null,
    location: null,
    organizer: null,
    imageMediaId: null,
    imageAlt: null,
    buttonLabel: null,
    buttonUrl: null,
    buttonColor: null,
    isMain: false,
    editorialStatus: 'draft',
    publishedAt: null,
    sortOrder: null,
    institutions: [],
    ...parcial,
  }
}

function construir(actual: EventRecord = evento()) {
  const estados: Array<{ estado: string; publishedAt: Date | null }> = []

  const repo: Pick<EventRepository, 'findById' | 'setEditorialStatus'> = {
    findById: () => Promise.resolve(actual),
    setEditorialStatus: (_id, estado, publishedAt) => {
      estados.push({ estado, publishedAt })
      return Promise.resolve({ ...actual, editorialStatus: estado, publishedAt })
    },
  }

  const audit = { record: () => Promise.resolve() } as unknown as AuditLogger

  return { casos: new EventUseCases(repo as EventRepository, audit, () => AHORA), estados }
}

describe('EventUseCases', () => {
  it('publicar sella la fecha del reloj inyectado', async () => {
    const { casos, estados } = construir()

    await casos.publish('e1', ACTOR)

    expect(estados[0]).toEqual({ estado: 'published', publishedAt: AHORA })
  })

  it('archivar conserva la fecha de publicacion', async () => {
    const { casos, estados } = construir(evento({ editorialStatus: 'published', publishedAt: SALIO }))

    await casos.archive('e1', ACTOR)

    // Es cuando salio a la web, no cuando se retiro. Con `null` se perdia para siempre:
    // volver a publicarlo sella la fecha de ese momento, no la de la primera vez.
    expect(estados[0]).toEqual({ estado: 'archived', publishedAt: SALIO })
  })

  it('archivar algo que nunca salio deja la fecha vacia, no inventa una', async () => {
    const { casos, estados } = construir(evento({ editorialStatus: 'draft' }))

    await casos.archive('e1', ACTOR)

    expect(estados[0]).toEqual({ estado: 'archived', publishedAt: null })
  })

  it('archivar y volver a publicar no recupera la fecha vieja, la sustituye', async () => {
    // No es un capricho de la prueba: es la razon por la que perderla importaba. Si el
    // dia que se archiva se borrara la fecha, esta segunda publicacion seria la unica
    // que quedaria, y con ella el evento cambiaria de sitio en cualquier listado por
    // fecha de publicacion.
    const { casos, estados } = construir(evento({ editorialStatus: 'published', publishedAt: SALIO }))

    await casos.archive('e1', ACTOR)
    await casos.publish('e1', ACTOR)

    expect(estados.map((e) => e.publishedAt)).toEqual([SALIO, AHORA])
  })
})
