import {
  del,
  getWithMeta,
  patch,
  upload,
  type PaginatedMeta,
} from '@/lib/api/client'

/** Cliente de `/api/admin/media` (ERS §10, ADR-0002). */

/** Propositos aceptados por el backend; cada uno con su lista blanca de formatos. */
export const MEDIA_PURPOSES = [
  'document',
  'slides',
  'image',
  'dataset',
  'archive',
  'source',
] as const
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number]

/** Etiquetas y formatos, para explicar al usuario qué puede subir en cada caso. */
export const PURPOSE_LABELS: Record<
  MediaPurpose,
  { label: string; accepts: string }
> = {
  document: { label: 'Document', accepts: 'PDF, DOCX, ODT' },
  slides: { label: 'Slides', accepts: 'PDF, PPTX, ODP' },
  image: { label: 'Image', accepts: 'JPG, PNG, WebP, GIF' },
  dataset: { label: 'Data', accepts: 'XLSX, ODS, CSV, TSV, JSON' },
  archive: { label: 'Archive', accepts: 'ZIP, TAR.GZ, 7Z' },
  source: {
    label: 'Code / sources',
    accepts: 'TEX, BIB, R, DO, M, PY, TXT, MD',
  },
}

export interface MediaAsset {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string | null
  altText: string | null
  caption: string | null
  credit: string | null
  isPublic: boolean
  createdAt: string
}

/**
 * Familias de archivo. El archivo no guarda para qué se subió, así que se agrupa por su
 * tipo real, el que se detectó al subirlo.
 */
export const MEDIA_KINDS = [
  'image',
  'document',
  'data',
  'text',
  'archive',
] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

export const NOMBRE_DE_FAMILIA: Record<MediaKind, string> = {
  image: 'Images',
  document: 'Documents',
  data: 'Data',
  text: 'Text and code',
  archive: 'Archives',
}

export interface MediaListParams {
  page?: number
  page_size?: number
  /** Busca en el nombre del archivo. */
  q?: string
  kind?: MediaKind
  visibility?: 'public' | 'private'
}

export async function listMedia(
  params: MediaListParams
): Promise<{ items: MediaAsset[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<MediaAsset[]>(
    '/api/admin/media',
    params
  )
  return { items: data, meta }
}

/**
 * Sube un archivo.
 *
 * El `purpose` determina qué formatos acepta el backend, que valida el tipo REAL por
 * magic bytes: la extensión y el Content-Type que envía el navegador se ignoran.
 * `visibility` por defecto es privado; hacerlo público es una decisión explícita.
 */
export function uploadMedia(
  file: File,
  options: { purpose: MediaPurpose; visibility: 'public' | 'private' },
  onProgress?: (percent: number) => void
): Promise<MediaAsset> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('purpose', options.purpose)
  formData.append('visibility', options.visibility)
  return upload<MediaAsset>('/api/admin/media/upload', formData, onProgress)
}

export function updateMediaMetadata(
  id: string,
  input: {
    altText?: string | null
    caption?: string | null
    credit?: string | null
    isPublic?: boolean
  }
): Promise<MediaAsset> {
  return patch<MediaAsset>(`/api/admin/media/${id}`, input)
}

/** Sin `force`, la API responde 409 si el archivo está en uso. */
export function deleteMedia(id: string, force = false): Promise<void> {
  return del(`/api/admin/media/${id}`, force ? { force: 'true' } : undefined)
}

/** Tamaño legible para la interfaz: los bytes crudos no le dicen nada a nadie. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
