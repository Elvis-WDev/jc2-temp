import type { Prisma } from '../generated/client.js'
import type {
  CourseMaterialRecord,
  CourseOfferingRecord,
  CourseRecord,
} from '../../../../application/ports/repositories/CourseRepository.js'

/**
 * Include del agregado curso: tags, ediciones, institucion, departamento y materiales.
 *
 * `satisfies` en lugar de `as const`: valida la forma contra Prisma sin convertir los
 * `orderBy` anidados en arrays readonly, que Prisma rechaza.
 */
export const INCLUDE_COURSE = {
  tags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
  offerings: {
    orderBy: [{ academicYear: 'desc' }, { sortOrder: 'asc' }],
    include: {
      institution: { select: { name: true, slug: true } },
      department: { select: { name: true } },
      teachers: {
        orderBy: { sortOrder: 'asc' },
        include: { person: { select: { fullName: true } } },
      },
      materials: { orderBy: { sortOrder: 'asc' } },
    },
  },
} satisfies Prisma.CourseInclude

interface FilaMaterial {
  id: string
  courseOfferingId: string
  mediaId: string | null
  externalUrl: string | null
  materialType: string
  title: string
  description: string | null
  sortOrder: number
  isPublic: boolean
}

interface FilaEdicion {
  id: string
  courseId: string
  institutionId: string
  institution: { name: string }
  departmentId: string | null
  department: { name: string } | null
  teachers: Array<{
    personId: string
    role: string | null
    sortOrder: number
    person: { fullName: string }
  }>
  name: string | null
  courseCode: string | null
  term: string | null
  academicYear: number | null
  startDate: Date | null
  endDate: Date | null
  teachingRole: string | null
  summary: string | null
  contentMarkdown: string | null
  isActive: boolean
  editorialStatus: string
  sortOrder: number | null
  materials: FilaMaterial[]
}

export function mapMaterial(fila: FilaMaterial): CourseMaterialRecord {
  return { ...fila }
}

export function mapOffering(fila: FilaEdicion): CourseOfferingRecord {
  return {
    id: fila.id,
    courseId: fila.courseId,
    institutionId: fila.institutionId,
    institutionName: fila.institution.name,
    departmentId: fila.departmentId,
    departmentName: fila.department?.name ?? null,
    name: fila.name,
    courseCode: fila.courseCode,
    term: fila.term,
    academicYear: fila.academicYear,
    startDate: fila.startDate,
    endDate: fila.endDate,
    teachingRole: fila.teachingRole,
    summary: fila.summary,
    contentMarkdown: fila.contentMarkdown,
    isActive: fila.isActive,
    editorialStatus: fila.editorialStatus,
    sortOrder: fila.sortOrder,
    teachers: fila.teachers.map((docente) => ({
      personId: docente.personId,
      fullName: docente.person.fullName,
      role: docente.role,
      sortOrder: docente.sortOrder,
    })),
    materials: fila.materials.map(mapMaterial),
  }
}

export function mapCourse(fila: {
  id: string
  title: string
  shortTitle: string | null
  slug: string
  defaultCode: string | null
  level: string | null
  summary: string | null
  descriptionMarkdown: string | null
  coverMediaId: string | null
  externalUrl: string | null
  editorialStatus: string
  isFeatured: boolean
  featuredOrder: number | null
  displayOrder: number | null
  publishedAt: Date | null
  tags: Array<{ tag: { id: string; slug: string; name: string } }>
  offerings: FilaEdicion[]
}): CourseRecord {
  return {
    id: fila.id,
    title: fila.title,
    shortTitle: fila.shortTitle,
    slug: fila.slug,
    defaultCode: fila.defaultCode,
    level: fila.level,
    summary: fila.summary,
    descriptionMarkdown: fila.descriptionMarkdown,
    coverMediaId: fila.coverMediaId,
    externalUrl: fila.externalUrl,
    editorialStatus: fila.editorialStatus,
    isFeatured: fila.isFeatured,
    featuredOrder: fila.featuredOrder,
    displayOrder: fila.displayOrder,
    publishedAt: fila.publishedAt,
    tags: fila.tags.map((relacion) => relacion.tag),
    offerings: fila.offerings.map(mapOffering),
  }
}
