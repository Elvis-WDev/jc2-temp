import type {
  AffiliationInput,
  AffiliationRecord,
  PeopleRepository,
  PersonInput,
  PersonLinkInput,
  PersonLinkRecord,
  PersonRecord,
  PersonUsage,
} from '../../../../application/ports/repositories/PeopleRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'

const CAMPOS_PERSONA = {
  id: true,
  isSiteOwner: true,
  fullName: true,
  givenName: true,
  familyName: true,
  preferredName: true,
  professionalTitle: true,
  currentPosition: true,
  publicEmail: true,
  phone: true,
  city: true,
  countryCode: true,
  shortBio: true,
  fullBioMarkdown: true,
  researchStatementMarkdown: true,
  photoMediaId: true,
  cvMediaId: true,
  orcid: true,
  googleScholarUrl: true,
  scopusUrl: true,
  ssrnUrl: true,
  repecUrl: true,
  websiteUrl: true,
  sortName: true,
} as const

const CAMPOS_LINK = {
  id: true,
  personId: true,
  linkType: true,
  label: true,
  url: true,
  iconKey: true,
  iconMediaId: true,
  isPublic: true,
  sortOrder: true,
} as const

const CAMPOS_AFILIACION = {
  id: true,
  personId: true,
  institutionId: true,
  departmentId: true,
  title: true,
  affiliationType: true,
  startDate: true,
  endDate: true,
  isPrimary: true,
  isCurrent: true,
  descriptionMarkdown: true,
  sortOrder: true,
  institution: { select: { name: true } },
  department: { select: { name: true } },
} as const

/** Aplana los nombres, que en la consulta llegan anidados. */
function aAfiliacion(
  fila: {
    institution: { name: string }
    department: { name: string } | null
  } & Omit<AffiliationRecord, 'institutionName' | 'departmentName'>,
): AffiliationRecord {
  const { institution, department, ...resto } = fila
  return {
    ...resto,
    institutionName: institution.name,
    departmentName: department?.name ?? null,
  }
}

export class PrismaPeopleRepository implements PeopleRepository {
  async listPersons(
    query: PaginationQuery,
    filters: { search: string | null },
  ): Promise<{ items: PersonRecord[]; totalItems: number }> {
    const where =
      filters.search === null || filters.search.trim() === ''
        ? {}
        : {
            OR: [
              { fullName: { contains: filters.search, mode: 'insensitive' as const } },
              { sortName: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }

    const { skip, take } = toSkipTake(query)
    const [items, totalItems] = await Promise.all([
      prisma.person.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortName: 'asc' }, { fullName: 'asc' }],
        select: CAMPOS_PERSONA,
      }),
      prisma.person.count({ where }),
    ])

    return { items, totalItems }
  }

  findPerson(id: string): Promise<PersonRecord | null> {
    return prisma.person.findUnique({ where: { id }, select: CAMPOS_PERSONA })
  }

  findSiteOwner(): Promise<PersonRecord | null> {
    return prisma.person.findFirst({ where: { isSiteOwner: true }, select: CAMPOS_PERSONA })
  }

  createPerson(input: PersonInput): Promise<PersonRecord> {
    // `isSiteOwner` no se acepta por API: solo puede haber uno y lo fija el seeder.
    // El indice unico parcial de la migracion lo respalda.
    return prisma.person.create({ data: input, select: CAMPOS_PERSONA })
  }

  updatePerson(id: string, input: Partial<PersonInput>): Promise<PersonRecord> {
    return prisma.person.update({ where: { id }, data: input, select: CAMPOS_PERSONA })
  }

  async deletePerson(id: string): Promise<void> {
    await prisma.person.delete({ where: { id } })
  }

  async countPersonUsage(id: string): Promise<PersonUsage> {
    const [publishedAuthorships, totalAuthorships, affiliations, persona] = await Promise.all([
      prisma.workAuthor.count({
        where: { personId: id, work: { editorialStatus: 'published' } },
      }),
      prisma.workAuthor.count({ where: { personId: id } }),
      prisma.affiliation.count({ where: { personId: id } }),
      prisma.person.findUnique({ where: { id }, select: { isSiteOwner: true } }),
    ])

    return {
      publishedAuthorships,
      totalAuthorships,
      affiliations,
      isSiteOwner: persona?.isSiteOwner ?? false,
    }
  }

  listPersonLinks(personId: string, publicOnly: boolean): Promise<PersonLinkRecord[]> {
    return prisma.personLink.findMany({
      where: { personId, ...(publicOnly ? { isPublic: true } : {}) },
      orderBy: { sortOrder: 'asc' },
      select: CAMPOS_LINK,
    })
  }

  createPersonLink(input: PersonLinkInput): Promise<PersonLinkRecord> {
    return prisma.personLink.create({ data: input, select: CAMPOS_LINK })
  }

  updatePersonLink(id: string, input: Partial<PersonLinkInput>): Promise<PersonLinkRecord> {
    return prisma.personLink.update({ where: { id }, data: input, select: CAMPOS_LINK })
  }

  async deletePersonLink(id: string): Promise<void> {
    await prisma.personLink.delete({ where: { id } })
  }

  async listAffiliations(personId: string, currentOnly: boolean): Promise<AffiliationRecord[]> {
    const filas = await prisma.affiliation.findMany({
      where: { personId, ...(currentOnly ? { isCurrent: true } : {}) },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      select: CAMPOS_AFILIACION,
    })
    return filas.map(aAfiliacion)
  }

  async findAffiliation(id: string): Promise<AffiliationRecord | null> {
    const fila = await prisma.affiliation.findUnique({ where: { id }, select: CAMPOS_AFILIACION })
    return fila === null ? null : aAfiliacion(fila)
  }

  async createAffiliation(input: AffiliationInput): Promise<AffiliationRecord> {
    return aAfiliacion(await prisma.affiliation.create({ data: input, select: CAMPOS_AFILIACION }))
  }

  async updateAffiliation(
    id: string,
    input: Partial<AffiliationInput>,
  ): Promise<AffiliationRecord> {
    return aAfiliacion(
      await prisma.affiliation.update({ where: { id }, data: input, select: CAMPOS_AFILIACION }),
    )
  }

  async deleteAffiliation(id: string): Promise<void> {
    await prisma.affiliation.delete({ where: { id } })
  }
}
