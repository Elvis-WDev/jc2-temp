import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import type { StorageProvider } from '../../ports/StorageProvider.js'
import type { MediaReferences, MediaRepository } from '../../ports/repositories/MediaRepository.js'

export interface DeleteMediaInput {
  id: string
  /** Borrado forzado: solo desde una accion explicita del administrador. */
  force: boolean
}

/** Devuelve los usos que impiden el borrado, en lenguaje entendible. */
function describirUsos(referencias: MediaReferences): string[] {
  const etiquetas: Array<[keyof MediaReferences, string]> = [
    ['workFiles', 'work files'],
    ['courseMaterials', 'course materials'],
    ['personPhotos', 'profile photos'],
    ['personCvs', 'CVs'],
    ['institutionLogos', 'institution logos'],
    ['workCovers', 'work covers'],
    ['courseCovers', 'course covers'],
    ['pageHeroes', 'page header images'],
    ['siteOgImages', 'the site OpenGraph image'],
    ['siteLogos', 'the site emblem'],
    ['siteFooters', 'the footer image'],
    ['postImages', 'a news item or blog entry'],
    ['postFiles', 'an attachment of a news item or blog entry'],
    ['sectionBackgrounds', 'section backgrounds'],
    ['eventImages', 'event images'],
    ['linkIcons', 'link icons'],
  ]

  return etiquetas
    .filter(([clave]) => referencias[clave] > 0)
    .map(([clave, etiqueta]) => `${referencias[clave]} ${etiqueta}`)
}

/**
 * Borra un archivo (ERS §32, §50).
 *
 * El orden importa: primero se quita la fila y despues el binario. Al reves, si el
 * commit fallase, el archivo ya no estaria y la fila apuntaria al vacio. Asi, si
 * falla el borrado en disco, queda un huerfano que el barrido recoge; es un fallo
 * mucho mas barato que una referencia rota.
 */
export class DeleteMedia {
  constructor(
    private readonly media: MediaRepository,
    private readonly storage: StorageProvider,
  ) {}

  async execute(input: DeleteMediaInput): Promise<void> {
    const asset = await this.media.findById(input.id)
    if (asset === null) {
      throw new NotFoundError('The file does not exist.', 'MEDIA_NOT_FOUND')
    }

    if (!input.force) {
      const referencias = await this.media.countReferences(input.id)
      if (referencias.total > 0) {
        throw new ConflictError(
          `The file is in use by ${describirUsos(referencias).join(', ')}. Detach it first, or delete it explicitly with force.`,
          'MEDIA_IN_USE',
        )
      }
    }

    await this.media.delete(input.id)
    await this.storage.delete(asset.storageKey)
  }
}
