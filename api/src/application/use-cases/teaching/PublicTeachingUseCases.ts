import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { CourseRecord } from '../../ports/repositories/CourseRepository.js'
import type {
  PublicCourseRepository,
  PublicCourseSummary,
  PublicTeachingFilters,
  TeachingFacets,
} from '../../ports/repositories/PublicCourseRepository.js'
import type { CatalogRepository } from '../../ports/repositories/CatalogRepository.js'

export interface PublicTeachingList extends Paginated<PublicCourseSummary> {
  facets: TeachingFacets
}

export interface PublicCourseDetail {
  course: CourseRecord
  /**
   * Como se llama cada tipo de material, en cristiano. Sin esto la ficha publica
   * ensenaba el codigo interno, "problem_set", en vez de "Hoja de problemas".
   */
  materialTypeLabels: Record<string, string>
}

/** Lectura publica de Teaching (ERS §30). El repositorio solo ve lo publicado. */
export class PublicTeachingUseCases {
  constructor(
    private readonly repo: PublicCourseRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async list(query: PaginationQuery, filters: PublicTeachingFilters): Promise<PublicTeachingList> {
    const [pagina, facets] = await Promise.all([
      this.repo.list(query, filters),
      this.repo.facets(filters),
    ])
    return { ...paginate(pagina.items, query, pagina.totalItems), facets }
  }

  async get(idOrSlug: string): Promise<PublicCourseDetail> {
    // Tambien los terminos ocultos: un material guardado con un tipo que despues se
    // oculto sigue teniendo que mostrar su nombre.
    const [curso, tipos] = await Promise.all([
      this.repo.findPublished(idOrSlug),
      this.catalog.list('course_material', false),
    ])

    if (curso === null) throw new NotFoundError('The course does not exist.', 'COURSE_NOT_FOUND')

    return {
      course: curso,
      materialTypeLabels: Object.fromEntries(tipos.map((tipo) => [tipo.code, tipo.label])),
    }
  }
}
