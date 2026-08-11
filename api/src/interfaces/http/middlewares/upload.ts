import path from 'node:path'
import multer, { MulterError } from 'multer'
import type { RequestHandler } from 'express'
import { env } from '../../../config/env.js'
import { PayloadTooLargeError, ValidationError } from '../../../shared/errors/AppError.js'

/**
 * Recepcion del multipart.
 *
 * El destino temporal esta DENTRO de STORAGE_ROOT a proposito: el renombrado a la
 * ubicacion definitiva solo es atomico dentro del mismo sistema de archivos. Con el
 * temporal en /tmp, un montaje distinto convertiria el rename en copiar y borrar,
 * que no es atomico.
 *
 * Aqui solo se limita el tamano. Que tipo se acepta lo decide la politica de dominio
 * tras leer los magic bytes: el mimetype que anuncia el cliente no vale nada.
 */
const almacen = multer({
  dest: path.join(env.STORAGE_ROOT, 'tmp'),
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
    fields: 10,
  },
})

function traducirError(error: unknown): unknown {
  if (!(error instanceof MulterError)) return error

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new PayloadTooLargeError(
        `The file exceeds the maximum upload size of ${Math.floor(env.MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
        'MEDIA_TOO_LARGE',
      )
    case 'LIMIT_FILE_COUNT':
      return new ValidationError('Upload one file at a time.', { file: 'Too many files.' })
    case 'LIMIT_UNEXPECTED_FILE':
      return new ValidationError('Unexpected field name. Send the file as `file`.', {
        file: 'Unexpected field.',
      })
    default:
      return new ValidationError('The upload could not be processed.', { file: error.message })
  }
}

/** Acepta un unico archivo en el campo `file`, con errores en el envelope estandar. */
export function uploadSingleFile(): RequestHandler {
  const handler = almacen.single('file')

  return (req, res, next) => {
    handler(req, res, (error: unknown) => {
      if (error !== undefined && error !== null) {
        next(traducirError(error))
        return
      }
      next()
    })
  }
}
