import type { MediaAssetRecord } from '../../../application/ports/repositories/MediaRepository.js'

/**
 * Capa 3 del blindaje (plan seccion 5): lista blanca explicita de campos.
 *
 * Nunca se serializa la entidad entera. `storageKey` revelaria la disposicion del
 * disco y `uploadedBy` un identificador interno de usuario: ninguno de los dos tiene
 * por que salir de aqui (frontend.md:60-65).
 */
export interface MediaAssetDto {
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

export function toMediaAssetDto(asset: MediaAssetRecord): MediaAssetDto {
  return {
    id: asset.id,
    originalFilename: asset.originalFilename,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    checksumSha256: asset.checksumSha256,
    altText: asset.altText,
    caption: asset.caption,
    credit: asset.credit,
    isPublic: asset.isPublic,
    createdAt: asset.createdAt.toISOString(),
  }
}
