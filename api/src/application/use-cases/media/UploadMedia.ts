import type { Readable } from 'node:stream'
import {
  purposeAcceptsText,
  resolveTextFormat,
  textFormatsForPurpose,
} from '../../../domain/media/TextFormatPolicy.js'
import {
  allowedTypesForPurpose,
  maxBytesForPurpose,
  resolveAllowedType,
  type MediaPurpose,
  type Visibility,
} from '../../../domain/media/UploadPolicy.js'
import { ValidationError } from '../../../shared/errors/AppError.js'
import type { FileTypeDetector } from '../../ports/FileTypeDetector.js'
import type { IdGenerator } from '../../ports/IdGenerator.js'
import type { StorageProvider } from '../../ports/StorageProvider.js'
import type { MediaAssetRecord, MediaRepository } from '../../ports/repositories/MediaRepository.js'

export interface UploadMediaInput {
  /**
   * Factoria, no un stream: el contenido se lee dos veces, una para inspeccionar el
   * tipo y otra para escribirlo. Un stream solo se puede consumir una vez.
   */
  openContent: () => Readable
  originalFilename: string
  purpose: MediaPurpose
  visibility: Visibility
  uploadedBy: string | null
}

/** Formato resuelto, venga del camino binario o del de texto. */
interface FormatoResuelto {
  mime: string
  extension: string
}

/** Enumera lo aceptado por un proposito, para que el mensaje de error sea util. */
function describirAceptados(purpose: MediaPurpose): string {
  const binarios = allowedTypesForPurpose(purpose).map((tipo) => `.${tipo.extension}`)
  const textos = textFormatsForPurpose(purpose).map((formato) => `.${formato.extension}`)
  const todos = [...binarios, ...textos]

  return todos.length === 0 ? 'none' : todos.join(', ')
}

/**
 * Sube un archivo (plan de huecos, paso 2).
 *
 * Primero se valida el tipo REAL y solo entonces se escribe. Al reves habria que
 * borrar lo ya escrito, y un fallo a medias dejaria basura en disco.
 */
export class UploadMedia {
  constructor(
    private readonly storage: StorageProvider,
    private readonly media: MediaRepository,
    private readonly detector: FileTypeDetector,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * Dos caminos, porque los formatos de texto plano no tienen firma binaria:
   *
   *  - con firma: el MIME detectado manda y la extension sale de el;
   *  - sin firma: el contenido debe ser texto UTF-8 real Y la extension del nombre
   *    original debe estar en la lista blanca del proposito.
   */
  private resolverFormato(
    purpose: MediaPurpose,
    originalFilename: string,
    inspeccion: { mime: string | null; looksLikeText: boolean },
  ): FormatoResuelto {
    if (inspeccion.mime !== null) {
      const permitido = resolveAllowedType(purpose, inspeccion.mime)
      if (permitido === null) {
        throw new ValidationError(
          `Files of type ${inspeccion.mime} are not accepted for ${purpose}. Accepted: ${describirAceptados(purpose)}.`,
          { file: `Unsupported file type: ${inspeccion.mime}.` },
          'MEDIA_TYPE_NOT_ALLOWED',
        )
      }
      return { mime: permitido.mime, extension: permitido.extension }
    }

    if (!inspeccion.looksLikeText || !purposeAcceptsText(purpose)) {
      throw new ValidationError(
        `The file type could not be recognised. Accepted for ${purpose}: ${describirAceptados(purpose)}.`,
        { file: 'Unrecognised file type.' },
        'MEDIA_TYPE_NOT_RECOGNISED',
      )
    }

    const formatoTexto = resolveTextFormat(purpose, originalFilename)
    if (formatoTexto === null) {
      // Es texto, pero con una extension que no admitimos: asi quedan fuera .html,
      // .svg y .js aunque su contenido sea texto perfectamente valido.
      throw new ValidationError(
        `That file extension is not accepted for ${purpose}. Accepted: ${describirAceptados(purpose)}.`,
        { file: 'Unsupported file extension.' },
        'MEDIA_EXTENSION_NOT_ALLOWED',
      )
    }

    return { mime: formatoTexto.mime, extension: formatoTexto.extension }
  }

  async execute(input: UploadMediaInput): Promise<MediaAssetRecord> {
    const inspeccion = await this.detector.inspect(input.openContent())
    const formato = this.resolverFormato(input.purpose, input.originalFilename, inspeccion)

    const id = this.ids.generate()

    const guardado = await this.storage.save({
      content: input.openContent(),
      visibility: input.visibility,
      extension: formato.extension,
      id,
    })

    const maximo = maxBytesForPurpose(input.purpose)
    if (guardado.sizeBytes > maximo) {
      // multer ya corta por tamano, pero el limite por proposito es mas fino que el
      // global. Si se supera aqui, se deshace la escritura.
      await this.storage.delete(guardado.storageKey)
      throw new ValidationError(
        `Files for ${input.purpose} must not exceed ${Math.floor(maximo / 1024 / 1024)} MB.`,
        { file: 'File is too large.' },
        'MEDIA_TOO_LARGE',
      )
    }

    try {
      return await this.media.create({
        id,
        storageKey: guardado.storageKey,
        originalFilename: input.originalFilename,
        mimeType: formato.mime,
        sizeBytes: guardado.sizeBytes,
        checksumSha256: guardado.checksumSha256,
        isPublic: input.visibility === 'public',
        uploadedBy: input.uploadedBy,
      })
    } catch (error) {
      // Sin fila en la base de datos, el archivo seria inalcanzable y eterno.
      await this.storage.delete(guardado.storageKey)
      throw error
    }
  }
}
