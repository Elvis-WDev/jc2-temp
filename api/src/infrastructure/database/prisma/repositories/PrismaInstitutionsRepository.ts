import type {
  DepartmentInput,
  DepartmentRecord,
  DepartmentUsage,
  InstitutionInput,
  InstitutionListFilters,
  InstitutionRecord,
  InstitutionUsage,
  InstitutionsRepository,
} from '../../../../application/ports/repositories/InstitutionsRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'

const CAMPOS_INSTITUCION = {
  id: true,
  name: true,
  shortName: true,
  slug: true,
  websiteUrl: true,
  countryCode: true,
  city: true,
  logoMediaId: true,
  description: true,
  brandColor: true,
  sortOrder: true,
  isActive: true,
} as const

const CAMPOS_DEPARTAMENTO = {
  id: true,
  institutionId: true,
  name: true,
  shortName: true,
  slug: true,
  websiteUrl: true,
  descriptionMarkdown: true,
  sortOrder: true,
  isActive: true,
  institution: { select: { name: true } },
} as const

/** Aplana el nombre de la institucion, que en la consulta llega anidado. */
function aDepartamento(fila: {
  id: string
  institutionId: string
  name: string
  shortName: string | null
  slug: string
  websiteUrl: string | null
  descriptionMarkdown: string | null
  sortOrder: number
  isActive: boolean
  institution: { name: string }
}): DepartmentRecord {
  const { institution, ...resto } = fila
  return { ...resto, institutionName: institution.name }
}

export class PrismaInstitutionsRepository implements InstitutionsRepository {
  async listInstitutions(
    query: PaginationQuery,
    filters: InstitutionListFilters,
  ): Promise<{ items: InstitutionRecord[]; totalItems: number }> {
    const where: Prisma.InstitutionWhereInput = {
      ...(filters.active === null ? {} : { isActive: filters.active }),
      // Se busca tambien por las siglas: a una universidad se la conoce mas por "UNSW"
      // que por su nombre entero.
      ...(filters.search === null
        ? {}
        : {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { shortName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
    }
    const { skip, take } = toSkipTake(query)

    const [items, totalItems] = await Promise.all([
      prisma.institution.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: CAMPOS_INSTITUCION,
      }),
      prisma.institution.count({ where }),
    ])

    return { items, totalItems }
  }

  findInstitution(id: string): Promise<InstitutionRecord | null> {
    return prisma.institution.findUnique({ where: { id }, select: CAMPOS_INSTITUCION })
  }

  createInstitution(input: InstitutionInput): Promise<InstitutionRecord> {
    return prisma.institution.create({ data: input, select: CAMPOS_INSTITUCION })
  }

  updateInstitution(id: string, input: Partial<InstitutionInput>): Promise<InstitutionRecord> {
    return prisma.institution.update({ where: { id }, data: input, select: CAMPOS_INSTITUCION })
  }

  async deleteInstitution(id: string): Promise<void> {
    await prisma.institution.delete({ where: { id } })
  }

  async countInstitutionUsage(id: string): Promise<InstitutionUsage> {
    const [departments, affiliations, courseOfferings] = await Promise.all([
      prisma.department.count({ where: { institutionId: id } }),
      prisma.affiliation.count({ where: { institutionId: id } }),
      prisma.courseOffering.count({ where: { institutionId: id } }),
    ])
    return { departments, affiliations, courseOfferings }
  }

  async listDepartments(institutionId: string | null): Promise<DepartmentRecord[]> {
    const filas = await prisma.department.findMany({
      where: institutionId === null ? {} : { institutionId },
      // Agrupados por institucion y alfabeticos dentro de cada una: asi el listado
      // completo se lee por bloques en lugar de mezclar departamentos de todas.
      orderBy: [{ institution: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: CAMPOS_DEPARTAMENTO,
    })
    return filas.map(aDepartamento)
  }

  async findDepartment(id: string): Promise<DepartmentRecord | null> {
    const fila = await prisma.department.findUnique({ where: { id }, select: CAMPOS_DEPARTAMENTO })
    return fila === null ? null : aDepartamento(fila)
  }

  async createDepartment(input: DepartmentInput): Promise<DepartmentRecord> {
    return aDepartamento(
      await prisma.department.create({ data: input, select: CAMPOS_DEPARTAMENTO }),
    )
  }

  async updateDepartment(id: string, input: Partial<DepartmentInput>): Promise<DepartmentRecord> {
    return aDepartamento(
      await prisma.department.update({ where: { id }, data: input, select: CAMPOS_DEPARTAMENTO }),
    )
  }

  async deleteDepartment(id: string): Promise<void> {
    await prisma.department.delete({ where: { id } })
  }

  async countDepartmentUsage(id: string): Promise<DepartmentUsage> {
    const [affiliations, courseOfferings] = await Promise.all([
      prisma.affiliation.count({ where: { departmentId: id } }),
      prisma.courseOffering.count({ where: { departmentId: id } }),
    ])
    return { affiliations, courseOfferings }
  }
}
