import type {
  TagInput,
  TagRecord,
  TagRepository,
  TagUsage,
} from '../../../../application/ports/repositories/TagRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'

const CAMPOS = {
  id: true,
  name: true,
  slug: true,
  category: true,
  sortOrder: true,
  isActive: true,
} satisfies Prisma.TagSelect

export class PrismaTagRepository implements TagRepository {
  async list(
    query: PaginationQuery,
    filters: { search: string | null; category: string | null; active: boolean | null },
  ): Promise<{ items: TagRecord[]; totalItems: number }> {
    const where: Prisma.TagWhereInput = {
      ...(filters.active === null ? {} : { isActive: filters.active }),
      ...(filters.category === null ? {} : { category: filters.category }),
      ...(filters.search === null || filters.search.trim() === ''
        ? {}
        : { name: { contains: filters.search, mode: 'insensitive' } }),
    }

    const { skip, take } = toSkipTake(query)
    const [items, totalItems] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: CAMPOS,
      }),
      prisma.tag.count({ where }),
    ])

    return { items, totalItems }
  }

  async listCategories(): Promise<string[]> {
    const filas = await prisma.tag.findMany({
      where: { category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    })
    // `distinct` sobre una columna que admite nulos puede devolver el nulo igualmente
    // segun el filtro; se descarta aqui para que el tipo sea honesto.
    return filas
      .map((fila) => fila.category)
      .filter((categoria): categoria is string => categoria !== null)
  }

  findById(id: string): Promise<TagRecord | null> {
    return prisma.tag.findUnique({ where: { id }, select: CAMPOS })
  }

  findBySlug(slug: string): Promise<TagRecord | null> {
    return prisma.tag.findUnique({ where: { slug }, select: CAMPOS })
  }

  create(input: TagInput): Promise<TagRecord> {
    return prisma.tag.create({ data: input, select: CAMPOS })
  }

  update(id: string, input: Partial<TagInput>): Promise<TagRecord> {
    return prisma.tag.update({ where: { id }, data: input, select: CAMPOS })
  }

  async delete(id: string): Promise<void> {
    await prisma.tag.delete({ where: { id } })
  }

  async countUsage(id: string): Promise<TagUsage> {
    const [works, courses] = await Promise.all([
      prisma.workTag.count({ where: { tagId: id } }),
      prisma.courseTag.count({ where: { tagId: id } }),
    ])
    return { works, courses, total: works + courses }
  }
}
