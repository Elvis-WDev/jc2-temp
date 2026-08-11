import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Autor de un trabajo con su orden (ERS §16). */
export interface WorkAuthorInput {
  personId: string
  authorOrder: number
  contributionRole?: string | null
  isCorresponding?: boolean
}

export interface WorkLinkInput {
  linkType: string
  label?: string | null
  url: string
  sortOrder?: number
  isPublic?: boolean
}

export interface WorkFileInput {
  mediaId: string
  fileType: string
  label?: string | null
  versionLabel?: string | null
  sortOrder?: number
  isPublic?: boolean
}

export interface WorkWriteInput {
  workTypeId: string
  title: string
  subtitle?: string | null
  slug: string
  abstractMarkdown?: string | null
  descriptionMarkdown?: string | null
  /** Codigo del estado academico. Es lo que viaja por la API y por la URL publica. */
  academicStatus: string
  publicationDate?: Date | null
  publicationYear?: number | null
  firstOnlineDate?: Date | null
  /** Ficha de la publicacion. Excluyente con `venueName`. */
  venueId?: string | null
  /** Texto suelto, para lo que no merece ficha propia. */
  venueName?: string | null
  publisherName?: string | null
  volume?: string | null
  issue?: string | null
  pages?: string | null
  articleNumber?: string | null
  doi?: string | null
  isbn?: string | null
  issn?: string | null
  languageCode?: string | null
  coverMediaId?: string | null
  citationTextOverride?: string | null
  versionLabel?: string | null
  downloadCode?: string | null
  bibtexOverride?: string | null
  displayOrder?: number | null
  isOpenAccess?: boolean
  authors?: WorkAuthorInput[]
  tagIds?: string[]
  links?: WorkLinkInput[]
  files?: WorkFileInput[]
}

export interface WorkAuthorRecord {
  personId: string
  fullName: string
  givenName: string | null
  familyName: string | null
  authorOrder: number
  contributionRole: string | null
  isCorresponding: boolean
}

export interface WorkRecord {
  id: string
  workTypeId: string
  workTypeCode: string
  workTypeLabel: string
  title: string
  subtitle: string | null
  slug: string
  abstractMarkdown: string | null
  descriptionMarkdown: string | null
  /** Codigo del estado academico: lo que viaja por la API y por la URL publica. */
  academicStatus: string
  /** Resueltos al leer, para pintar la tabla sin volver a consultar. */
  academicStatusLabel: string
  academicStatusTone: string
  editorialStatus: string
  publicationDate: Date | null
  publicationYear: number | null
  firstOnlineDate: Date | null
  venueId: string | null
  /** Nombre resuelto: el de la ficha si la hay, y si no el texto suelto. */
  venueName: string | null
  /** Datos de la ficha, para poder mostrarlos sin otra consulta. */
  venueAbbreviation: string | null
  venueRanking: string | null
  publisherName: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  articleNumber: string | null
  doi: string | null
  isbn: string | null
  issn: string | null
  languageCode: string | null
  coverMediaId: string | null
  citationTextOverride: string | null
  /** En que version esta el trabajo. Distinto de la version de cada archivo. */
  versionLabel: string | null
  /** Codigo para descargarlo en una web externa. Informativo: no restringe nada aqui. */
  downloadCode: string | null
  bibtexOverride: string | null
  isFeatured: boolean
  featuredOrder: number | null
  /** En el carrusel de la portada. Seleccion aparte de los destacados. */
  isCarousel: boolean
  carouselOrder: number | null
  displayOrder: number | null
  isOpenAccess: boolean
  publishedAt: Date | null
  archivedAt: Date | null
  authors: WorkAuthorRecord[]
  tags: Array<{ id: string; slug: string; name: string }>
  links: Array<{
    id: string
    linkType: string
    label: string | null
    url: string
    isPublic: boolean
  }>
  files: Array<{
    id: string
    mediaId: string
    fileType: string
    label: string | null
    versionLabel: string | null
    isPublic: boolean
  }>
}

/**
 * Repositorio administrativo: ve TODO, incluidos borradores y archivados.
 *
 * Su gemelo publico, `PublicWorkRepository`, es una interfaz distinta a proposito.
 * Ver plan seccion 5, capa 2.
 */
export interface WorkRepository {
  list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<{ items: WorkRecord[]; totalItems: number }>
  findById(id: string): Promise<WorkRecord | null>
  slugExists(slug: string, exceptId?: string): Promise<boolean>

  /** Escritura compuesta y transaccional (ERS §49): work + autores + tags + links + archivos. */
  create(input: WorkWriteInput): Promise<WorkRecord>
  update(id: string, input: Partial<WorkWriteInput>): Promise<WorkRecord>

  setEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    extra: {
      publishedAt?: Date | null
      archivedAt?: Date | null
      isFeatured?: boolean
      featuredOrder?: number | null
      isCarousel?: boolean
      carouselOrder?: number | null
    },
  ): Promise<WorkRecord>
  setFeatured(id: string, isFeatured: boolean, featuredOrder: number | null): Promise<WorkRecord>
  setCarousel(id: string, isCarousel: boolean, carouselOrder: number | null): Promise<WorkRecord>
  delete(id: string): Promise<void>
  countAuthors(id: string): Promise<number>
}
