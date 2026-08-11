import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError, InternalError } from '../../../shared/errors/AppError.js'
import { failure } from '../../../shared/http/envelope.js'
import { zodIssuesToFields } from './validate.js'

/** Errores que emite body-parser antes de que ninguna ruta llegue a ejecutarse. */
interface BodyParserError extends Error {
  type?: string
  status?: number
}

/** Violacion de una restriccion unica en PostgreSQL, tal como la reporta Prisma. */
interface PrismaError extends Error {
  code?: string
  meta?: unknown
}

/**
 * Nombres legibles de las columnas que llevan restriccion unica, para poder decir
 * cual choca en lugar de soltar el nombre de la columna de la base de datos.
 */
const CAMPO_LEGIBLE: Record<string, string> = {
  slug: 'This identifier is already in use.',
  code: 'This code is already in use.',
  doi: 'This DOI is already registered.',
  email: 'This email is already registered.',
}

function normalizar(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error instanceof ZodError) {
    // Un ZodError que llega hasta aqui salio de una validacion interna, no del
    // middleware validate(), pero la forma de respuesta debe ser la misma.
    return new AppError({
      code: 'VALIDATION_ERROR',
      message: 'The request payload is invalid.',
      httpStatus: 422,
      fields: zodIssuesToFields(error),
    })
  }

  const posible = error as BodyParserError
  if (posible?.type === 'entity.parse.failed') {
    return new AppError({
      code: 'MALFORMED_JSON',
      message: 'The request body is not valid JSON.',
      httpStatus: 400,
    })
  }
  if (posible?.type === 'entity.too.large') {
    return new AppError({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request body is too large.',
      httpStatus: 413,
    })
  }

  /**
   * Red de seguridad para los choques con una restriccion unica.
   *
   * Los casos de uso que conocen la regla la comprueban antes y dan un mensaje mejor
   * (un tag duplicado devuelve ademas cual es el existente). Esto cubre el resto: sin
   * ello, repetir el identificador de una institucion respondia 500 "error inesperado,
   * contacte con soporte" en lugar de decir simplemente que ya esta en uso.
   *
   * Es un conflicto de datos, no un fallo del servidor, asi que 409 y mensaje visible.
   */
  const prisma = error as PrismaError
  if (prisma?.code === 'P2002') {
    // Que columna choca no viene en un sitio fijo: con el adaptador de driver que usa
    // este proyecto llega en `meta.driverAdapterError.cause.constraint.fields`, y en
    // otras configuraciones en `meta.target`. Se busca el nombre dentro de todo `meta`,
    // que funciona con cualquiera de las dos formas.
    const detalle = JSON.stringify(prisma.meta ?? '')
    const campo = Object.keys(CAMPO_LEGIBLE).find((columna) => detalle.includes(`"${columna}"`))

    return new AppError({
      code: 'ALREADY_EXISTS',
      message:
        campo === undefined
          ? 'Another record already uses one of these values.'
          : (CAMPO_LEGIBLE[campo] as string),
      httpStatus: 409,
      ...(campo === undefined ? {} : { fields: { [campo]: CAMPO_LEGIBLE[campo] as string } }),
    })
  }

  return new InternalError(error instanceof Error ? error.message : 'Unknown error', error)
}

/**
 * Unico punto que traduce errores a HTTP.
 *
 * Un 500 nunca devuelve el mensaje original: se registra con el requestId y el
 * cliente recibe texto generico (ERS §48, feedback-and-states.md:73).
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Si la respuesta ya empezo a enviarse, solo Express puede cerrarla limpiamente.
  if (res.headersSent) {
    next(error)
    return
  }

  const appError = normalizar(error)
  // pino-http tipa `req.id` como string | number | object. Solo los dos primeros
  // producen un identificador util; un objeto se serializaria como [object Object].
  const requestId =
    typeof req.id === 'string' ? req.id : typeof req.id === 'number' ? String(req.id) : 'unknown'

  if (appError.isOperational) {
    req.log?.warn({ code: appError.code, status: appError.httpStatus }, appError.message)
  } else {
    req.log?.error({ err: appError, code: appError.code }, 'Unhandled error')
  }

  const mensajePublico = appError.isOperational
    ? appError.message
    : 'An unexpected error occurred. Contact support with the request id.'

  res.status(appError.httpStatus).json(
    failure({
      code: appError.code,
      message: mensajePublico,
      requestId,
      ...(appError.fields === undefined ? {} : { fields: appError.fields }),
    }),
  )
}
