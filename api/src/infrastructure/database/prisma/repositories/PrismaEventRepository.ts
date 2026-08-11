import type {
  EventListFilters,
  EventRecord,
  EventRepository,
  EventWriteInput,
} from '../../../../application/ports/repositories/EventRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { matchIdOrSlug } from '../../../../shared/uuid.js'
import { prisma } from '../client.js'
import type { EditorialStatus, Prisma } from '../generated/client.js'

const INCLUDE = {
  institutions: { include: { institution: { select: { id: true, name: true } } } },
} as const

/** Solo lo publicado sale a la web (RN-001). */
const SOLO_PUBLICADOS = { editorialStatus: 'published' } as const

type Fila = Omit<EventRecord, 'institutions' | 'editorialStatus'> & {
  editorialStatus: string
  institutions: Array<{ institution: { id: string; name: string } }>
}

function aRegistro(fila: Fila): EventRecord {
  const { institutions, ...resto } = fila
  return { ...resto, institutions: institutions.map((fila2) => fila2.institution) }
}

/** Las instituciones se reemplazan enteras: es mas simple que calcular el diferencial. */
async function escribirInstituciones(
  tx: Prisma.TransactionClient,
  eventId: string,
  institutionIds: string[] | undefined,
): Promise<void> {
  if (institutionIds === undefined) return
  await tx.eventInstitution.deleteMany({ where: { eventId } })
  if (institutionIds.length > 0) {
    await tx.eventInstitution.createMany({
      data: institutionIds.map((institutionId) => ({ eventId, institutionId })),
    })
  }
}

function escalares(input: Partial<EventWriteInput>) {
  const { institutionIds: _i, ...resto } = input
  return resto
}

export class PrismaEventRepository implements EventRepository {
  async list(
    query: PaginationQuery,
    filters: EventListFilters,
  ): Promise<{ items: EventRecord[]; totalItems: number }> {
    const where: Prisma.EventWhereInput = {
      ...(filters.editorialStatus === null
        ? {}
        : { editorialStatus: filters.editorialStatus as EditorialStatus }),
      ...(filters.eventType === null ? {} : { eventType: filters.eventType }),
      ...(filters.search === null || filters.search.trim() === ''
        ? {}
        : {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { location: { contains: filters.search, mode: 'insensitive' } },
              { organizer: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: [{ startsAt: 'desc' }],
        include: INCLUDE,
      }),
      prisma.event.count({ where }),
    ])

    return { items: filas.map(aRegistro), totalItems }
  }

  async findById(id: string): Promise<EventRecord | null> {
    const fila = await prisma.event.findUnique({ where: { id }, include: INCLUDE })
    return fila === null ? null : aRegistro(fila)
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const encontrado = await prisma.event.findFirst({
      where: { slug, ...(exceptId === undefined ? {} : { NOT: { id: exceptId } }) },
      select: { id: true },
    })
    return encontrado !== null
  }

  async create(input: EventWriteInput): Promise<EventRecord> {
    const creado = await prisma.$transaction(async (tx) => {
      const evento = await tx.event.create({
        data: {
          ...escalares(input),
          title: input.title,
          slug: input.slug,
          startsAt: input.startsAt,
        },
        select: { id: true },
      })
      await escribirInstituciones(tx, evento.id, input.institutionIds)
      return evento.id
    })

    return (await this.findById(creado)) as EventRecord
  }

  async update(id: string, input: Partial<EventWriteInput>): Promise<EventRecord> {
    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: escalares(input) })
      await escribirInstituciones(tx, id, input.institutionIds)
    })

    return (await this.findById(id)) as EventRecord
  }

  async delete(id: string): Promise<void> {
    await prisma.event.delete({ where: { id } })
  }

  async setEditorialStatus(
    id: string,
    status: string,
    publishedAt: Date | null,
  ): Promise<EventRecord> {
    await prisma.event.update({
      where: { id },
      data: { editorialStatus: status as EditorialStatus, publishedAt },
    })
    return (await this.findById(id)) as EventRecord
  }

  async listPublished(
    query: PaginationQuery,
    filters: { eventType: string | null; upcoming: boolean | null },
  ): Promise<{ items: EventRecord[]; totalItems: number }> {
    const ahora = new Date()
    const where: Prisma.EventWhereInput = {
      ...SOLO_PUBLICADOS,
      ...(filters.eventType === null ? {} : { eventType: filters.eventType }),
      // Un evento sigue siendo "proximo" mientras no haya terminado: si tiene fecha de
      // fin manda esa, y si no, la de inicio.
      ...(filters.upcoming === null
        ? {}
        : filters.upcoming
          ? { OR: [{ endsAt: { gte: ahora } }, { endsAt: null, startsAt: { gte: ahora } }] }
          : { OR: [{ endsAt: { lt: ahora } }, { endsAt: null, startsAt: { lt: ahora } }] }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        // Los destacados primero; despues, por fecha.
        //
        // El sentido depende de hacia donde se mira: en lo que esta por venir importa
        // lo que ocurre ANTES, y en lo ya pasado, lo mas reciente. Con un solo sentido,
        // "proximos eventos" ensenaba primero el mas lejano.
        orderBy: [{ isMain: 'desc' }, { startsAt: filters.upcoming === true ? 'asc' : 'desc' }],
        include: INCLUDE,
      }),
      prisma.event.count({ where }),
    ])

    return { items: filas.map(aRegistro), totalItems }
  }

  async findPublished(idOrSlug: string): Promise<EventRecord | null> {
    const fila = await prisma.event.findFirst({
      where: { ...SOLO_PUBLICADOS, OR: matchIdOrSlug(idOrSlug) },
      include: INCLUDE,
    })
    return fila === null ? null : aRegistro(fila)
  }
}
