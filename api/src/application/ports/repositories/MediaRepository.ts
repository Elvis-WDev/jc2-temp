import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Vista de `media_assets` que maneja la aplicacion. */
export interface MediaAssetRecord {
  id: string
  storageKey: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string | null
  altText: string | null
  caption: string | null
  credit: string | null
  isPublic: boolean
  uploadedBy: string | null
  createdAt: Date
}

export interface CreateMediaAssetInput {
  id: string
  storageKey: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  isPublic: boolean
  uploadedBy: string | null
  altText?: string | null
  caption?: string | null
  credit?: string | null
}

/**
 * Filtros de la biblioteca. `null` significa "no filtrar por esto", no "vacio": una
 * biblioteca de cien archivos es inmanejable sin poder acotar.
 */
export interface MediaListFilters {
  /** Familia de archivo (`MediaKind`), ya traducida a la lista de MIME que la componen. */
  mimeTypes: readonly string[] | null
  /** true = solo los publicos, false = solo los privados, null = todos. */
  isPublic: boolean | null
  /** Busca en el nombre original del archivo. */
  search: string | null
}

export interface UpdateMediaMetadataInput {
  altText?: string | null
  caption?: string | null
  credit?: string | null
  isPublic?: boolean
}

/** Desglose de quien usa un archivo, para poder explicar por que no se puede borrar. */
export interface MediaReferences {
  workFiles: number
  courseMaterials: number
  personPhotos: number
  personCvs: number
  institutionLogos: number
  workCovers: number
  courseCovers: number
  pageHeroes: number
  siteOgImages: number
  siteLogos: number
  sectionBackgrounds: number
  eventImages: number
  linkIcons: number
  total: number
}

export interface MediaRepository {
  create(input: CreateMediaAssetInput): Promise<MediaAssetRecord>
  findById(id: string): Promise<MediaAssetRecord | null>
  findByChecksum(checksum: string): Promise<MediaAssetRecord | null>
  list(
    query: PaginationQuery,
    filters: MediaListFilters,
  ): Promise<{ items: MediaAssetRecord[]; totalItems: number }>
  updateMetadata(id: string, input: UpdateMediaMetadataInput): Promise<MediaAssetRecord>
  delete(id: string): Promise<void>

  /** Cuenta quien referencia el archivo, para bloquear el borrado (ERS §32, §50). */
  countReferences(id: string): Promise<MediaReferences>

  /**
   * Decide si el archivo puede descargarse SIN sesion.
   *
   * No basta con `media_assets.is_public`: hace falta ademas que algo publicado y
   * publico lo referencie. Un PDF marcado publico pero colgado de un work en
   * borrador no debe ser descargable, o el estado `draft` no significaria nada.
   *
   * Vive en el repositorio y no en el controlador a proposito: es la misma razon por
   * la que el filtro de publicacion no se delega a quien escribe la ruta.
   */
  isPubliclyReachable(id: string): Promise<boolean>
}
