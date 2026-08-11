import { createReadStream } from 'node:fs'
import { rm } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import type { Request, RequestHandler, Response } from 'express'
import type { DeleteMedia } from '../../../application/use-cases/media/DeleteMedia.js'
import type {
  DownloadAudience,
  DownloadableMedia,
  GetMediaForDownload,
} from '../../../application/use-cases/media/GetMediaForDownload.js'
import type { ListMedia } from '../../../application/use-cases/media/ListMedia.js'
import type { UpdateMediaMetadata } from '../../../application/use-cases/media/UpdateMediaMetadata.js'
import type { UploadMedia } from '../../../application/use-cases/media/UploadMedia.js'
import { ValidationError } from '../../../shared/errors/AppError.js'
import { success } from '../../../shared/http/envelope.js'
import { sanitizeDownloadFilename } from '../../../shared/http/contentDisposition.js'
import { toMediaAssetDto } from '../presenters/media.presenter.js'
import { validated } from '../middlewares/validate.js'
import type { MediaListQuery, UpdateMediaBody, UploadBody } from '../schemas/media.schemas.js'

export interface MediaControllerDeps {
  uploadMedia: UploadMedia
  listMedia: ListMedia
  updateMediaMetadata: UpdateMediaMetadata
  deleteMedia: DeleteMedia
  getMediaForDownload: GetMediaForDownload
}

/**
 * Escribe la respuesta de una descarga.
 *
 * `Content-Type` sale SIEMPRE del tipo almacenado, que se detecto por magic bytes al
 * subir. Nunca de nada que envie quien descarga.
 */
async function enviarArchivo(res: Response, archivo: DownloadableMedia): Promise<void> {
  const nombre = sanitizeDownloadFilename(archivo.originalFilename)

  res.setHeader('Content-Type', archivo.mimeType)
  res.setHeader('Content-Length', archivo.sizeBytes)
  // Impide que el navegador ignore el Content-Type y adivine el tipo, que es como se
  // convierte un archivo inofensivo en HTML ejecutable.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader(
    'Content-Disposition',
    `${archivo.inlineSafe ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(nombre)}`,
  )
  // Los binarios son inmutables bajo su storage_key, asi que la cache puede ser
  // agresiva. Los privados no se cachean en ningun sitio.
  res.setHeader(
    'Cache-Control',
    archivo.isPublic ? 'public, max-age=31536000, immutable' : 'private, no-store',
  )

  await pipeline(archivo.content, res)
}

export function createMediaController(deps: MediaControllerDeps) {
  const descargar = (audience: DownloadAudience): RequestHandler => {
    return (req: Request, res: Response, next) => {
      const { params } = validated<{ id: string }>(req)

      deps.getMediaForDownload
        .execute(params.id, audience)
        .then((archivo) => enviarArchivo(res, archivo))
        .catch(next)
    }
  }

  return {
    upload: (req: Request, res: Response, next: (error?: unknown) => void): void => {
      const archivo = req.file
      if (archivo === undefined) {
        next(new ValidationError('A file is required.', { file: 'No file was uploaded.' }))
        return
      }

      const { body } = validated<unknown, unknown, UploadBody>(req)

      deps.uploadMedia
        .execute({
          // Factoria: el caso de uso lee el contenido dos veces, una para detectar el
          // tipo y otra para escribirlo.
          openContent: () => createReadStream(archivo.path),
          originalFilename: archivo.originalname,
          purpose: body.purpose,
          visibility: body.visibility,
          uploadedBy: req.auth?.id ?? null,
        })
        .then((creado) => {
          res.status(201).json(success(toMediaAssetDto(creado)))
        })
        .catch(next)
        .finally(() => {
          // El temporal de multer se borra pase lo que pase: en el camino feliz ya se
          // copio a su ubicacion definitiva, y en el de error no debe quedar rastro.
          void rm(archivo.path, { force: true }).catch(() => undefined)
        })
    },

    list: (req: Request, res: Response, next: (error?: unknown) => void): void => {
      const { query } = validated<unknown, MediaListQuery>(req)

      deps.listMedia
        .execute(query, { kind: query.kind, visibility: query.visibility, q: query.q })
        .then((resultado) => {
          res.json(
            success(resultado.items.map(toMediaAssetDto), { pagination: resultado.pagination }),
          )
        })
        .catch(next)
    },

    update: (req: Request, res: Response, next: (error?: unknown) => void): void => {
      const { params, body } = validated<{ id: string }, unknown, UpdateMediaBody>(req)

      deps.updateMediaMetadata
        .execute(params.id, body)
        .then((actualizado) => {
          res.json(success(toMediaAssetDto(actualizado)))
        })
        .catch(next)
    },

    remove: (req: Request, res: Response, next: (error?: unknown) => void): void => {
      const { params, query } = validated<{ id: string }, { force: boolean }>(req)

      deps.deleteMedia
        .execute({ id: params.id, force: query.force })
        .then(() => {
          res.status(204).end()
        })
        .catch(next)
    },

    downloadAsAdmin: descargar('admin'),
    downloadAsPublic: descargar('public'),
  }
}
