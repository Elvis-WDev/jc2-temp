import type {
  WorkTypeCreateInput,
  WorkTypeRecord,
  WorkTypeRepository,
  WorkTypeUpdateInput,
} from '../../../../application/ports/repositories/WorkTypeRepository.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'

const CAMPOS = {
  id: true,
  code: true,
  label: true,
  pluralLabel: true,
  sortOrder: true,
  maxItemsHome: true,
  isActive: true,
} satisfies Prisma.WorkTypeSelect

export class PrismaWorkTypeRepository implements WorkTypeRepository {
  list(activeOnly: boolean): Promise<WorkTypeRecord[]> {
    return prisma.workType.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: CAMPOS,
    })
  }

  findById(id: string): Promise<WorkTypeRecord | null> {
    return prisma.workType.findUnique({ where: { id }, select: CAMPOS })
  }

  findByCode(code: string): Promise<WorkTypeRecord | null> {
    return prisma.workType.findUnique({ where: { code }, select: CAMPOS })
  }

  create(input: WorkTypeCreateInput): Promise<WorkTypeRecord> {
    return prisma.workType.create({ data: input, select: CAMPOS })
  }

  update(id: string, input: WorkTypeUpdateInput): Promise<WorkTypeRecord> {
    return prisma.workType.update({ where: { id }, data: input, select: CAMPOS })
  }

  async delete(id: string): Promise<void> {
    await prisma.workType.delete({ where: { id } })
  }

  countWorks(id: string): Promise<number> {
    return prisma.work.count({ where: { workTypeId: id } })
  }
}
