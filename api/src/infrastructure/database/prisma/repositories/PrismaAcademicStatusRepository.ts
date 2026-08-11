import type {
  AcademicStatusInput,
  AcademicStatusRecord,
  AcademicStatusRepository,
} from '../../../../application/ports/repositories/AcademicStatusRepository.js'
import { prisma } from '../client.js'

const CAMPOS = {
  id: true,
  code: true,
  label: true,
  tone: true,
  sortOrder: true,
  isActive: true,
} as const

export class PrismaAcademicStatusRepository implements AcademicStatusRepository {
  list(activeOnly: boolean): Promise<AcademicStatusRecord[]> {
    return prisma.academicStatus.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: CAMPOS,
    })
  }

  findById(id: string): Promise<AcademicStatusRecord | null> {
    return prisma.academicStatus.findUnique({ where: { id }, select: CAMPOS })
  }

  findByCode(code: string): Promise<AcademicStatusRecord | null> {
    return prisma.academicStatus.findUnique({ where: { code }, select: CAMPOS })
  }

  create(input: AcademicStatusInput): Promise<AcademicStatusRecord> {
    return prisma.academicStatus.create({ data: input, select: CAMPOS })
  }

  update(
    id: string,
    input: Partial<Omit<AcademicStatusInput, 'code'>> & { isActive?: boolean },
  ): Promise<AcademicStatusRecord> {
    return prisma.academicStatus.update({ where: { id }, data: input, select: CAMPOS })
  }

  async delete(id: string): Promise<void> {
    await prisma.academicStatus.delete({ where: { id } })
  }

  countWorks(id: string): Promise<number> {
    return prisma.work.count({ where: { academicStatusId: id } })
  }
}
