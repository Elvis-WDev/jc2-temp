import type { PaginationQuery } from '../../../shared/http/pagination.js'
import type { WorkRecord } from './WorkRepository.js'

export type ResearchSort = 'newest' | 'oldest' | 'title' | 'relevance' | 'type'

export interface PublicWorkFilters {
  q: string | null
  type: string | null
  status: string | null
  yearFrom: number | null
  yearTo: number | null
  tag: string | null
  sort: ResearchSort
}

/** Version resumida para el listado (PERF-002): sin archivos, links ni abstract completo. */
export interface PublicWorkSummary {
  id: string
  slug: string
  title: string
  subtitle: string | null
  workTypeCode: string
  workTypeLabel: string
  /** "Journal Articles": el rotulo del grupo cuando el listado se agrupa por tipo. */
  workTypePluralLabel: string
  academicStatus: string
  /** Etiqueta legible: el filtro publico ya no traduce codigos por su cuenta. */
  academicStatusLabel: string
  publicationYear: number | null
  /** Nombre resuelto: el de la ficha si la hay, y si no el texto suelto. */
  venueName: string | null
  venueAbbreviation: string | null
  venueRanking: string | null
  /** Volumen y numero son del articulo, no de la revista: cambian en cada uno. */
  volume: string | null
  issue: string | null
  doi: string | null
  isOpenAccess: boolean
  authors: Array<{ fullName: string; authorOrder: number }>
  tags: Array<{ slug: string; name: string }>
  /**
   * El PDF publico, si lo hay. Antes era solo un booleano y la tarjeta no podia
   * enlazarlo; PERF-002 excluye la lista entera de archivos, no una direccion.
   */
  pdfMediaId: string | null
  /**
   * El abstract en crudo, para recortarlo al presentar.
   *
   * Viaja en el listado desde que la tarjeta lo ensena fijo. Antes no venia —PERF-002:
   * no engordar la lista con textos que casi nadie abria— y cada tarjeta pedia su ficha
   * al desplegarse; con el abstract siempre a la vista, eso serian tantas peticiones
   * como publicaciones haya en la pagina.
   */
  abstractMarkdown: string | null
}

export interface ResearchFacets {
  types: Array<{ code: string; label: string; count: number }>
  statuses: Array<{ value: string; label: string; count: number }>
  years: Array<{ year: number; count: number }>
  tags: Array<{ slug: string; name: string; count: number }>
}

/**
 * Repositorio publico de Research.
 *
 * TODAS sus consultas llevan `editorial_status = 'published'` incrustado en la
 * implementacion. El controlador no puede olvidarse de filtrar porque no tiene forma
 * de expresarlo: RN-001 deja de depender de la disciplina de quien programa.
 */
export interface PublicWorkRepository {
  list(
    query: PaginationQuery,
    filters: PublicWorkFilters,
  ): Promise<{ items: PublicWorkSummary[]; totalItems: number }>

  /** Facets calculadas sobre el MISMO conjunto filtrado, para que cuadren con la lista. */
  facets(filters: PublicWorkFilters): Promise<ResearchFacets>

  /** Detalle completo. Devuelve null si no esta publicado. */
  findPublished(idOrSlug: string): Promise<WorkRecord | null>
}
