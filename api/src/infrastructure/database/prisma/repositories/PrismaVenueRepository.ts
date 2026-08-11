import type {
  VenueInput,
  VenueListFilters,
  VenueRecord,
  VenueRepository,
} from '../../../../application/ports/repositories/VenueRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'

const CAMPOS = {
  id: true,
  name: true,
  abbreviation: true,
  venueType: true,
  publisherName: true,
  issn: true,
  isbnPrefix: true,
  countryCode: true,
  websiteUrl: true,
  ranking: true,
  citeScore: true,
  notes: true,
  isActive: true,
  sortOrder: true,
  _count: { select: { works: true } },
} as const

/**
 * `cite_score` es NUMERIC en PostgreSQL y Prisma lo entrega como Decimal. La aplicacion
 * lo maneja como number: son puntuaciones con dos decimales, no importes de dinero.
 */
function aRegistro(
  fila: {
    citeScore: Prisma.Decimal | null
    _count: { works: number }
  } & Omit<VenueRecord, 'citeScore' | 'workCount'>,
): VenueRecord {
  const { _count, citeScore, ...resto } = fila
  return {
    ...resto,
    citeScore: citeScore === null ? null : Number(citeScore),
    workCount: _count.works,
  }
}

export class PrismaVenueRepository implements VenueRepository {
  async list(
    query: PaginationQuery,
    filters: VenueListFilters,
  ): Promise<{ items: VenueRecord[]; totalItems: number }> {
    const where: Prisma.VenueWhereInput = {
      ...(filters.active === null ? {} : { isActive: filters.active }),
      ...(filters.venueType === null ? {} : { venueType: filters.venueType }),
      // Se busca tambien por la abreviatura y por el ISSN: a una revista se la localiza
      // por cualquiera de los tres.
      ...(filters.search === null
        ? {}
        : {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { abbreviation: { contains: filters.search, mode: 'insensitive' } },
              { issn: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.venue.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: CAMPOS,
      }),
      prisma.venue.count({ where }),
    ])

    return { items: filas.map(aRegistro), totalItems }
  }

  async findById(id: string): Promise<VenueRecord | null> {
    const fila = await prisma.venue.findUnique({ where: { id }, select: CAMPOS })
    return fila === null ? null : aRegistro(fila)
  }

  async findByName(name: string): Promise<VenueRecord | null> {
    const fila = await prisma.venue.findUnique({ where: { name }, select: CAMPOS })
    return fila === null ? null : aRegistro(fila)
  }

  async create(input: VenueInput): Promise<VenueRecord> {
    return aRegistro(await prisma.venue.create({ data: input, select: CAMPOS }))
  }

  async update(id: string, input: Partial<VenueInput>): Promise<VenueRecord> {
    return aRegistro(await prisma.venue.update({ where: { id }, data: input, select: CAMPOS }))
  }

  async delete(id: string): Promise<void> {
    await prisma.venue.delete({ where: { id } })
  }

  countWorks(id: string): Promise<number> {
    return prisma.work.count({ where: { venueId: id } })
  }
}
