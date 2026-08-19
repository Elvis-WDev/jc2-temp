import { buildBibtex, buildCitationText } from '../../../domain/research/Citation.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type {
  PublicWorkFilters,
  PublicWorkRepository,
  PublicWorkSummary,
  ResearchFacets,
} from '../../ports/repositories/PublicWorkRepository.js'
import type { WorkRecord } from '../../ports/repositories/WorkRepository.js'
import type { CatalogRepository } from '../../ports/repositories/CatalogRepository.js'

export interface PublicResearchList extends Paginated<PublicWorkSummary> {
  facets: ResearchFacets
}

export interface PublicWorkDetail {
  work: WorkRecord
  citation: string
  bibtex: string
  /**
   * Como se llaman los tipos de archivo y de enlace, en cristiano.
   *
   * Sin esto, la ficha publica ensenaba el codigo interno: "PAPER_PDF" en vez de
   * "PDF del articulo". Las etiquetas salen de los catalogos, que el titular edita.
   */
  termLabels: {
    files: Record<string, string>
    links: Record<string, string>
  }
}

/**
 * Lectura publica de Research (ERS §30).
 *
 * Este caso de uso NO filtra por estado editorial: no puede, porque el repositorio
 * que recibe solo sabe devolver contenido publicado. Ver plan seccion 5, capa 2.
 */
function porCodigo(terminos: Array<{ code: string; label: string }>): Record<string, string> {
  return Object.fromEntries(terminos.map((termino) => [termino.code, termino.label]))
}

export class PublicResearchUseCases {
  constructor(
    private readonly repo: PublicWorkRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async list(query: PaginationQuery, filters: PublicWorkFilters): Promise<PublicResearchList> {
    // Lista y facets se piden en paralelo pero con los MISMOS filtros, para que los
    // recuentos cuadren con lo que el usuario esta viendo.
    const [pagina, facets] = await Promise.all([
      this.repo.list(query, filters),
      this.repo.facets(filters),
    ])

    return { ...paginate(pagina.items, query, pagina.totalItems), facets }
  }

  /**
   * Detalle completo. Acepta id o slug: el slug existe desde el dia uno (ERS §2.1)
   * para poder abrir paginas por paper mas adelante sin migrar nada.
   */
  async get(idOrSlug: string): Promise<PublicWorkDetail> {
    // Se piden a la vez los terminos ocultos tambien: un archivo guardado con un
    // termino que despues se oculto sigue teniendo que mostrar su nombre.
    const [work, tiposDeArchivo, tiposDeEnlace] = await Promise.all([
      this.repo.findPublished(idOrSlug),
      this.catalog.list('work_file', false),
      this.catalog.list('work_link', false),
    ])

    if (work === null) {
      throw new NotFoundError('The work does not exist.', 'WORK_NOT_FOUND')
    }

    const fuente = {
      title: work.title,
      subtitle: work.subtitle,
      authors: work.authors.map((autor) => ({
        fullName: autor.fullName,
        givenName: autor.givenName,
        familyName: autor.familyName,
      })),
      publicationYear: work.publicationYear,
      venueName: work.venueName,
      publisherName: work.publisherName,
      volume: work.volume,
      issue: work.issue,
      pages: work.pages,
      doi: work.doi,
      isbn: work.isbn,
      workTypeCode: work.workTypeCode,
      citationTextOverride: work.citationTextOverride,
      bibtexOverride: work.bibtexOverride,
    }

    return {
      work,
      citation: buildCitationText(fuente),
      bibtex: buildBibtex(fuente),
      termLabels: {
        files: porCodigo(tiposDeArchivo),
        links: porCodigo(tiposDeEnlace),
      },
    }
  }
}
