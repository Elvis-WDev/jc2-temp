import type {
  CourseMaterialInput,
  CourseMaterialRecord,
  CourseOfferingRecord,
  CourseOfferingTeacherInput,
  CourseOfferingWriteInput,
  CourseRecord,
  CourseRepository,
  CourseWriteInput,
} from '../../../../application/ports/repositories/CourseRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { EditorialStatus, Prisma } from '../generated/client.js'
import { INCLUDE_COURSE, mapCourse, mapMaterial, mapOffering } from './courseMapper.js'

const INCLUDE_OFFERING = {
  institution: { select: { name: true } },
  department: { select: { name: true } },
  teachers: {
    orderBy: { sortOrder: 'asc' },
    include: { person: { select: { fullName: true } } },
  },
  materials: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.CourseOfferingInclude

/**
 * El reparto de docencia se reemplaza entero en cada guardado.
 *
 * Es mas simple que calcular el diferencial y no tiene coste real: son dos o tres
 * personas por edicion, no un listado grande.
 */
async function escribirDocentes(
  tx: Prisma.TransactionClient,
  courseOfferingId: string,
  teachers: CourseOfferingTeacherInput[] | undefined,
): Promise<void> {
  if (teachers === undefined) return
  await tx.courseOfferingTeacher.deleteMany({ where: { courseOfferingId } })
  if (teachers.length > 0) {
    await tx.courseOfferingTeacher.createMany({
      data: teachers.map((docente, indice) => ({
        courseOfferingId,
        personId: docente.personId,
        role: docente.role ?? null,
        sortOrder: docente.sortOrder ?? indice,
      })),
    })
  }
}

/** Campos escalares de la edicion, sin las relaciones que se escriben aparte. */
function escalaresEdicion<T extends { teachers?: unknown }>(input: T) {
  const { teachers: _t, ...resto } = input
  return resto
}

/** Repositorio administrativo de Teaching. Ve borradores y archivados. */
export class PrismaCourseRepository implements CourseRepository {
  async list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<{ items: CourseRecord[]; totalItems: number }> {
    const where: Prisma.CourseWhereInput = {
      ...(filters.editorialStatus === null
        ? {}
        : { editorialStatus: filters.editorialStatus as EditorialStatus }),
      ...(filters.search === null || filters.search.trim() === ''
        ? {}
        : { title: { contains: filters.search, mode: 'insensitive' } }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: INCLUDE_COURSE,
      }),
      prisma.course.count({ where }),
    ])

    return { items: filas.map(mapCourse), totalItems }
  }

  async findById(id: string): Promise<CourseRecord | null> {
    const fila = await prisma.course.findUnique({ where: { id }, include: INCLUDE_COURSE })
    return fila === null ? null : mapCourse(fila)
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const encontrado = await prisma.course.findFirst({
      where: { slug, ...(exceptId === undefined ? {} : { NOT: { id: exceptId } }) },
      select: { id: true },
    })
    return encontrado !== null
  }

  async create(input: CourseWriteInput): Promise<CourseRecord> {
    const { tagIds, ...escalares } = input

    const id = await prisma.$transaction(async (tx) => {
      const curso = await tx.course.create({
        data: { ...escalares, editorialStatus: 'draft' },
        select: { id: true },
      })
      if (tagIds !== undefined && tagIds.length > 0) {
        await tx.courseTag.createMany({
          data: tagIds.map((tagId) => ({ courseId: curso.id, tagId })),
        })
      }
      return curso.id
    })

    return (await this.findById(id)) as CourseRecord
  }

  async update(id: string, input: Partial<CourseWriteInput>): Promise<CourseRecord> {
    const { tagIds, ...escalares } = input

    await prisma.$transaction(async (tx) => {
      await tx.course.update({ where: { id }, data: escalares })
      if (tagIds !== undefined) {
        await tx.courseTag.deleteMany({ where: { courseId: id } })
        if (tagIds.length > 0) {
          await tx.courseTag.createMany({ data: tagIds.map((tagId) => ({ courseId: id, tagId })) })
        }
      }
    })

    return (await this.findById(id)) as CourseRecord
  }

  async setEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    extra: { publishedAt?: Date | null; isFeatured?: boolean; featuredOrder?: number | null },
  ): Promise<CourseRecord> {
    await prisma.course.update({ where: { id }, data: { editorialStatus: status, ...extra } })
    return (await this.findById(id)) as CourseRecord
  }

  async setFeatured(
    id: string,
    isFeatured: boolean,
    featuredOrder: number | null,
  ): Promise<CourseRecord> {
    await prisma.course.update({ where: { id }, data: { isFeatured, featuredOrder } })
    return (await this.findById(id)) as CourseRecord
  }

  async delete(id: string): Promise<void> {
    await prisma.course.delete({ where: { id } })
  }

  async findOffering(id: string): Promise<CourseOfferingRecord | null> {
    const fila = await prisma.courseOffering.findUnique({
      where: { id },
      include: INCLUDE_OFFERING,
    })
    return fila === null ? null : mapOffering(fila)
  }

  async createOffering(input: CourseOfferingWriteInput): Promise<CourseOfferingRecord> {
    const fila = await prisma.$transaction(async (tx) => {
      const creada = await tx.courseOffering.create({
        data: { ...escalaresEdicion(input), editorialStatus: 'draft' },
        select: { id: true },
      })
      await escribirDocentes(tx, creada.id, input.teachers)
      return tx.courseOffering.findUniqueOrThrow({
        where: { id: creada.id },
        include: INCLUDE_OFFERING,
      })
    })
    return mapOffering(fila)
  }

  async updateOffering(
    id: string,
    input: Partial<CourseOfferingWriteInput>,
  ): Promise<CourseOfferingRecord> {
    const fila = await prisma.$transaction(async (tx) => {
      await tx.courseOffering.update({ where: { id }, data: escalaresEdicion(input) })
      await escribirDocentes(tx, id, input.teachers)
      return tx.courseOffering.findUniqueOrThrow({ where: { id }, include: INCLUDE_OFFERING })
    })
    return mapOffering(fila)
  }

  async setOfferingEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    publishedAt: Date | null,
  ): Promise<CourseOfferingRecord> {
    const fila = await prisma.courseOffering.update({
      where: { id },
      data: { editorialStatus: status, publishedAt },
      include: INCLUDE_OFFERING,
    })
    return mapOffering(fila)
  }

  async deleteOffering(id: string): Promise<void> {
    await prisma.courseOffering.delete({ where: { id } })
  }

  async findMaterial(id: string): Promise<CourseMaterialRecord | null> {
    const fila = await prisma.courseMaterial.findUnique({ where: { id } })
    return fila === null ? null : mapMaterial(fila)
  }

  async createMaterial(input: CourseMaterialInput): Promise<CourseMaterialRecord> {
    return mapMaterial(await prisma.courseMaterial.create({ data: input }))
  }

  async updateMaterial(
    id: string,
    input: Partial<CourseMaterialInput>,
  ): Promise<CourseMaterialRecord> {
    return mapMaterial(await prisma.courseMaterial.update({ where: { id }, data: input }))
  }

  async deleteMaterial(id: string): Promise<void> {
    await prisma.courseMaterial.delete({ where: { id } })
  }
}
