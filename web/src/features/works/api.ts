import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'
import { type StatusTone } from '@/components/status-badge'

/** Cliente de `/api/admin/works` (ERS §15, §33). */

/** ERS RF-005. Unica puerta de la visibilidad publica. */
export type EditorialStatus = 'draft' | 'published' | 'archived'

export const EDITORIAL_STATUS_LABELS: Record<EditorialStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

/** Tipos sugeridos por ERS §8 para los enlaces de un trabajo. */
/** Tipos de ERS §9 para los archivos de un trabajo. */
export interface WorkAuthor {
  personId: string
  fullName: string
  givenName: string | null
  familyName: string | null
  authorOrder: number
  contributionRole: string | null
  isCorresponding: boolean
}

export interface WorkLink {
  id?: string
  linkType: string
  label: string | null
  url: string
  isPublic: boolean
}

export interface WorkFile {
  id?: string
  mediaId: string
  fileType: string
  label: string | null
  versionLabel: string | null
  isPublic: boolean
}

export interface Work {
  id: string
  workTypeId: string
  workTypeCode: string
  workTypeLabel: string
  title: string
  subtitle: string | null
  slug: string
  abstractMarkdown: string | null
  descriptionMarkdown: string | null
  /** Codigo del estado. Los crea el titular en Estados academicos. */
  academicStatus: string
  /** Etiqueta y color, resueltos por la API: no hay mapa fijo que mantener. */
  academicStatusLabel: string
  academicStatusTone: StatusTone
  editorialStatus: EditorialStatus
  publicationDate: string | null
  publicationYear: number | null
  firstOnlineDate: string | null
  /** Ficha de la publicacion, si la tiene. */
  venueId: string | null
  /** Nombre resuelto: el de la ficha si la hay, y si no el texto suelto. */
  venueName: string | null
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
  /** Codigo para descargarlo en una web externa. Solo se muestra; no restringe nada. */
  downloadCode: string | null
  bibtexOverride: string | null
  isFeatured: boolean
  featuredOrder: number | null
  /** En el carrusel de la portada. Seleccion aparte de los destacados. */
  isCarousel: boolean
  carouselOrder: number | null
  displayOrder: number | null
  isOpenAccess: boolean
  publishedAt: string | null
  archivedAt: string | null
  authors: WorkAuthor[]
  tags: { id: string; slug: string; name: string }[]
  links: WorkLink[]
  files: WorkFile[]
}

export interface WorkListParams {
  page?: number
  page_size?: number
  q?: string
  status?: EditorialStatus
}

export interface WorkWriteInput {
  workTypeId: string
  title: string
  subtitle?: string | null
  slug?: string
  abstractMarkdown?: string | null
  descriptionMarkdown?: string | null
  /** Al escribir solo viaja el codigo; la etiqueta y el color los resuelve la API. */
  academicStatus: string
  publicationDate?: string | null
  publicationYear?: number | null
  /** Ficha o texto suelto, nunca los dos. */
  venueId?: string | null
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
  authors?: {
    personId: string
    authorOrder: number
    contributionRole?: string | null
    isCorresponding?: boolean
  }[]
  tagIds?: string[]
  links?: {
    linkType: string
    label?: string | null
    url: string
    isPublic?: boolean
  }[]
  files?: {
    mediaId: string
    fileType: string
    label?: string | null
    versionLabel?: string | null
    isPublic?: boolean
  }[]
}

export async function listWorks(
  params: WorkListParams
): Promise<{ items: Work[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Work[]>('/api/admin/works', params)
  return { items: data, meta }
}

export function getWork(id: string): Promise<Work> {
  return get<Work>(`/api/admin/works/${id}`)
}

export function createWork(input: WorkWriteInput): Promise<Work> {
  return post<Work>('/api/admin/works', input)
}

export function updateWork(
  id: string,
  input: Partial<WorkWriteInput>
): Promise<Work> {
  return patch<Work>(`/api/admin/works/${id}`, input)
}

/** RN-002: falla con 422 si el trabajo no tiene al menos un autor. */
export function publishWork(id: string): Promise<Work> {
  return post<Work>(`/api/admin/works/${id}/publish`)
}

export function archiveWork(id: string): Promise<Work> {
  return post<Work>(`/api/admin/works/${id}/archive`)
}

/** RN-003: falla con 422 si el trabajo no esta publicado. */
export function setWorkFeatured(
  id: string,
  isFeatured: boolean,
  featuredOrder: number | null
): Promise<Work> {
  return post<Work>(`/api/admin/works/${id}/featured`, {
    isFeatured,
    featuredOrder,
  })
}

/**
 * El carrusel de la portada.
 *
 * Aparte de los destacados a proposito: un trabajo puede estar en las dos listas, en
 * una o en ninguna. La API exige que este publicado, igual que para destacarlo.
 */
export function setWorkCarousel(
  id: string,
  isCarousel: boolean,
  carouselOrder: number | null
): Promise<Work> {
  return post<Work>(`/api/admin/works/${id}/carousel`, {
    isCarousel,
    carouselOrder,
  })
}

export function deleteWork(id: string): Promise<void> {
  return del(`/api/admin/works/${id}`)
}
