import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/**
 * Cliente de `/api/admin/courses` y sus dos niveles hijos.
 *
 * Un curso es la asignatura; una **edición** es una vez que se impartió, con su
 * institución, periodo y materiales. No existe un listado suelto de ediciones ni de
 * materiales: vienen dentro del curso, que es como se editan.
 */

export type EditorialStatus = 'draft' | 'published' | 'archived'

export interface CourseMaterial {
  id: string
  courseOfferingId: string
  /** Archivo subido **o** enlace externo, nunca los dos (ERS §24). */
  mediaId: string | null
  externalUrl: string | null
  materialType: string
  title: string
  description: string | null
  sortOrder: number
  isPublic: boolean
}

export interface CourseOffering {
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
  /** `AAAA-MM-DD`, el mismo formato que espera al guardar. */
  startDate: string | null
  endDate: string | null
  teachingRole: string | null
  summary: string | null
  contentMarkdown: string | null
  isActive: boolean
  editorialStatus: EditorialStatus
  sortOrder: number | null
  /** Quien la impartio. */
  teachers: Array<{
    personId: string
    fullName: string
    role: string | null
    sortOrder: number
  }>
  materials: CourseMaterial[]
}

export interface Course {
  id: string
  title: string
  shortTitle: string | null
  slug: string
  defaultCode: string | null
  level: string | null
  summary: string | null
  descriptionMarkdown: string | null
  coverMediaId: string | null
  /** Enlace a la ficha oficial del curso en la web de la institucion. */
  externalUrl: string | null
  editorialStatus: EditorialStatus
  isFeatured: boolean
  featuredOrder: number | null
  displayOrder: number | null
  publishedAt: string | null
  tags: Array<{ id: string; slug: string; name: string }>
  offerings: CourseOffering[]
}

export interface CourseListParams {
  page?: number
  page_size?: number
  q?: string
  status?: EditorialStatus
}

export interface CourseWriteInput {
  title: string
  shortTitle?: string | null
  /** Vacío al crear: el servidor lo deriva del título. */
  slug?: string
  defaultCode?: string | null
  level?: string | null
  summary?: string | null
  descriptionMarkdown?: string | null
  coverMediaId?: string | null
  externalUrl?: string | null
  displayOrder?: number | null
  tagIds?: string[]
}

export interface OfferingWriteInput {
  courseId: string
  institutionId: string
  departmentId?: string | null
  name?: string | null
  courseCode?: string | null
  term?: string | null
  academicYear?: number | null
  startDate?: string | null
  endDate?: string | null
  teachingRole?: string | null
  summary?: string | null
  contentMarkdown?: string | null
  isActive?: boolean
  sortOrder?: number | null
  /** La lista que se envía sustituye a la que había. */
  teachers?: Array<{
    personId: string
    role?: string | null
    sortOrder?: number
  }>
}

export interface MaterialWriteInput {
  courseOfferingId: string
  mediaId?: string | null
  externalUrl?: string | null
  materialType: string
  title: string
  description?: string | null
  sortOrder?: number
  isPublic?: boolean
}

// --- Cursos ---

export async function listCourses(
  params: CourseListParams
): Promise<{ items: Course[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Course[]>(
    '/api/admin/courses',
    params
  )
  return { items: data, meta }
}

export function getCourse(id: string): Promise<Course> {
  return get<Course>(`/api/admin/courses/${id}`)
}

export function createCourse(input: CourseWriteInput): Promise<Course> {
  return post<Course>('/api/admin/courses', input)
}

export function updateCourse(
  id: string,
  input: Partial<CourseWriteInput>
): Promise<Course> {
  return patch<Course>(`/api/admin/courses/${id}`, input)
}

export function deleteCourse(id: string): Promise<void> {
  return del(`/api/admin/courses/${id}`)
}

export function publishCourse(id: string): Promise<Course> {
  return post<Course>(`/api/admin/courses/${id}/publish`)
}

export function archiveCourse(id: string): Promise<Course> {
  return post<Course>(`/api/admin/courses/${id}/archive`)
}

export function setCourseFeatured(
  id: string,
  isFeatured: boolean,
  featuredOrder: number | null
): Promise<Course> {
  return post<Course>(`/api/admin/courses/${id}/featured`, {
    isFeatured,
    featuredOrder,
  })
}

// --- Ediciones ---

export function createOffering(
  input: OfferingWriteInput
): Promise<CourseOffering> {
  return post<CourseOffering>('/api/admin/course-offerings', input)
}

export function updateOffering(
  id: string,
  input: Partial<Omit<OfferingWriteInput, 'courseId'>>
): Promise<CourseOffering> {
  return patch<CourseOffering>(`/api/admin/course-offerings/${id}`, input)
}

export function deleteOffering(id: string): Promise<void> {
  return del(`/api/admin/course-offerings/${id}`)
}

/**
 * Publicar una edición exige que el curso ya esté publicado: la API responde 422
 * `OFFERING_COURSE_NOT_PUBLISHED`. La interfaz lo dice antes de dejar pulsar.
 */
export function publishOffering(id: string): Promise<CourseOffering> {
  return post<CourseOffering>(`/api/admin/course-offerings/${id}/publish`)
}

export function archiveOffering(id: string): Promise<CourseOffering> {
  return post<CourseOffering>(`/api/admin/course-offerings/${id}/archive`)
}

// --- Materiales ---

export function createMaterial(
  input: MaterialWriteInput
): Promise<CourseMaterial> {
  return post<CourseMaterial>('/api/admin/course-materials', input)
}

export function updateMaterial(
  id: string,
  input: Partial<Omit<MaterialWriteInput, 'courseOfferingId'>>
): Promise<CourseMaterial> {
  return patch<CourseMaterial>(`/api/admin/course-materials/${id}`, input)
}

export function deleteMaterial(id: string): Promise<void> {
  return del(`/api/admin/course-materials/${id}`)
}
