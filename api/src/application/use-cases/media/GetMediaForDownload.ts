import type { Readable } from 'node:stream'
import { isInlineSafe } from '../../../domain/media/UploadPolicy.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import type { StorageProvider } from '../../ports/StorageProvider.js'
import type { MediaRepository } from '../../ports/repositories/MediaRepository.js'

export interface DownloadableMedia {
  content: Readable
  mimeType: string
  originalFilename: string
  sizeBytes: number
  /** Solo los tipos seguros pueden mostrarse en el navegador; el resto se descarga. */
  inlineSafe: boolean
  isPublic: boolean
}

export type DownloadAudience = 'public' | 'admin'

/**
 * Resuelve un archivo para su entrega.
 *
 * Con audiencia `public` exige que el archivo sea alcanzable publicamente; si no lo
 * es, responde NotFound y no Forbidden: un 403 confirmaria que el identificador
 * existe, lo que permite enumerar archivos privados probando UUIDs.
 */
export class GetMediaForDownload {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: StorageProvider,
  ) {}

  async execute(id: string, audience: DownloadAudience): Promise<DownloadableMedia> {
    const asset = await this.media.findById(id)
    if (asset === null) {
      throw new NotFoundError('The file does not exist.', 'MEDIA_NOT_FOUND')
    }

    if (audience === 'public') {
      const alcanzable = await this.media.isPubliclyReachable(id)
      if (!alcanzable) {
        throw new NotFoundError('The file does not exist.', 'MEDIA_NOT_FOUND')
      }
    }

    // La fila puede existir sin binario si un borrado quedo a medias. Se trata como
    // inexistente en lugar de propagar un error del sistema de archivos.
    if (!(await this.storage.exists(asset.storageKey))) {
      throw new NotFoundError('The file does not exist.', 'MEDIA_NOT_FOUND')
    }

    return {
      content: await this.storage.openRead(asset.storageKey),
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename,
      sizeBytes: asset.sizeBytes,
      inlineSafe: isInlineSafe(asset.mimeType),
      isPublic: asset.isPublic,
    }
  }
}
