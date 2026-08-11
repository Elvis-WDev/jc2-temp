import type { PaginationQuery } from '../../../shared/http/pagination.js'

/**
 * Cursos y ediciones (ERS §21-24).
 *
 * `CourseWriteInput` NO tiene institutionId ni departmentId: es la decision central
 * del ERS §2.4. La institucion pertenece a la edicion.
 */

export interface CourseMaterialRecord {
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

export type CourseMaterialInput = Omit<CourseMaterialRecord, 'id'>

export interface CourseOfferingRecord {
  id: string
  courseId: string
  institutionId: string
  institutionName: string
  departmentId: string | null
  departmentName: string | null
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
  /** Quien la impartio. Sustituye al texto libre `teachingRole`. */
  teachers: Array<{ personId: string; fullName: string; role: string | null; sortOrder: number }>
  materials: CourseMaterialRecord[]
}

export interface CourseOfferingTeacherInput {
  personId: string
  role?: string | null
  sortOrder?: number
}

export interface CourseOfferingWriteInput {
  courseId: string
  institutionId: string
  departmentId?: string | null
  name?: string | null
  courseCode?: string | null
  term?: string | null
  academicYear?: number | null
  startDate?: Date | null
  endDate?: Date | null
  teachingRole?: string | null
  summary?: string | null
  contentMarkdown?: string | null
  isActive?: boolean
  sortOrder?: number | null
  teachers?: CourseOfferingTeacherInput[]
}

export interface CourseRecord {
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
  tags: Array<{ id: string; slug: string; name: string }>
  offerings: CourseOfferingRecord[]
}

export interface CourseWriteInput {
  title: string
  shortTitle?: string | null
  slug: string
  defaultCode?: string | null
  level?: string | null
  summary?: string | null
  descriptionMarkdown?: string | null
  coverMediaId?: string | null
  externalUrl?: string | null
  displayOrder?: number | null
  tagIds?: string[]
}

export interface CourseRepository {
  list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<{ items: CourseRecord[]; totalItems: number }>
  findById(id: string): Promise<CourseRecord | null>
  slugExists(slug: string, exceptId?: string): Promise<boolean>
  create(input: CourseWriteInput): Promise<CourseRecord>
  update(id: string, input: Partial<CourseWriteInput>): Promise<CourseRecord>
  setEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    extra: { publishedAt?: Date | null; isFeatured?: boolean; featuredOrder?: number | null },
  ): Promise<CourseRecord>
  setFeatured(id: string, isFeatured: boolean, featuredOrder: number | null): Promise<CourseRecord>
  delete(id: string): Promise<void>

  findOffering(id: string): Promise<CourseOfferingRecord | null>
  createOffering(input: CourseOfferingWriteInput): Promise<CourseOfferingRecord>
  updateOffering(
    id: string,
    input: Partial<CourseOfferingWriteInput>,
  ): Promise<CourseOfferingRecord>
  setOfferingEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    publishedAt: Date | null,
  ): Promise<CourseOfferingRecord>
  deleteOffering(id: string): Promise<void>

  findMaterial(id: string): Promise<CourseMaterialRecord | null>
  createMaterial(input: CourseMaterialInput): Promise<CourseMaterialRecord>
  updateMaterial(id: string, input: Partial<CourseMaterialInput>): Promise<CourseMaterialRecord>
  deleteMaterial(id: string): Promise<void>
}
