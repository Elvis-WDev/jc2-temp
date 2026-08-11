import { NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  MediaAssetRecord,
  MediaRepository,
  UpdateMediaMetadataInput,
} from '../../ports/repositories/MediaRepository.js'

/**
 * Actualiza solo metadatos: alt, pie, credito y visibilidad.
 *
 * Los binarios son inmutables (plan seccion 4.6). "Sustituir un archivo" es subir
 * uno nuevo y repuntar la referencia, nunca reescribir bytes bajo una storage_key
 * existente: eso invalidaria las cabeceras de cache inmutable y crearia una carrera
 * entre quien lee y quien escribe.
 */
export class UpdateMediaMetadata {
  constructor(private readonly media: MediaRepository) {}

  async execute(id: string, input: UpdateMediaMetadataInput): Promise<MediaAssetRecord> {
    const existente = await this.media.findById(id)
    if (existente === null) {
      throw new NotFoundError('The file does not exist.', 'MEDIA_NOT_FOUND')
    }

    return this.media.updateMetadata(id, input)
  }
}
