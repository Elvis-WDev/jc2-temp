import type { PaginationQuery } from '../../../shared/http/pagination.js'
import type { CourseRecord } from './CourseRepository.js'

export interface PublicTeachingFilters {
  q: string | null
  institution: string | null
  department: string | null
  activeOnly: boolean
  tag: string | null
  sort: 'newest' | 'title'
}

/** Resumen para el listado de Teaching (ERS §54). */
export interface PublicCourseSummary {
  id: string
  slug: string
  title: string
  shortTitle: string | null
  level: string | null
  /** El de la edicion vigente si lo tiene, y si no el habitual del curso. */
  code: string | null
  summary: string | null
  tags: Array<{ slug: string; name: string }>
  /** La edicion vigente, o la mas reciente publicada si no hay ninguna activa. */
  currentOffering: {
    institution: string
    department: string | null
    term: string | null
    academicYear: number | null
    teachingRole: string | null
    isActive: boolean
  } | null
  offeringCount: number
}

export interface TeachingFacets {
  /**
   * Los niveles con los que la web agrupa los cursos.
   *
   * La etiqueta, el orden y la entradilla salen del catalogo `course_level`, que el
   * titular edita. Un nivel escrito a mano que no figure en el catalogo sale igual,
   * con su propio texto y al final: `courses.level` no tiene clave foranea.
   */
  levels: Array<{
    code: string
    label: string
    description: string | null
    sortOrder: number
    count: number
  }>
  institutions: Array<{ slug: string; name: string; count: number }>
  departments: Array<{ id: string; name: string; institution: string; count: number }>
  tags: Array<{ slug: string; name: string; count: number }>
}

/**
 * Repositorio publico de Teaching.
 *
 * Igual que en Research: `editorial_status = 'published'` va incrustado en cada
 * consulta, y ademas las ediciones se filtran por su propio estado. Un curso
 * publicado puede tener ediciones en borrador que no deben verse.
 */
export interface PublicCourseRepository {
  list(
    query: PaginationQuery,
    filters: PublicTeachingFilters,
  ): Promise<{ items: PublicCourseSummary[]; totalItems: number }>
  facets(filters: PublicTeachingFilters): Promise<TeachingFacets>
  findPublished(idOrSlug: string): Promise<CourseRecord | null>
  listFeatured(limit: number): Promise<PublicCourseSummary[]>
}
