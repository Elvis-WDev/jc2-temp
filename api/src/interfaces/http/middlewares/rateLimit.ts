import { rateLimit } from 'express-rate-limit'
import type { Request, RequestHandler } from 'express'
import { env } from '../../../config/env.js'
import { RateLimitError } from '../../../shared/errors/AppError.js'

/**
 * Rate limiting (SEC-007). El limitador no responde por su cuenta: delega en el
 * manejador de errores para que la forma del cuerpo sea la misma que la del resto.
 */
function crearLimitador(params: {
  windowMs: number
  limit: number
  code: string
  skip?: (req: Request) => boolean
}): RequestHandler {
  return rateLimit({
    windowMs: params.windowMs,
    limit: params.limit,
    ...(params.skip === undefined ? {} : { skip: params.skip }),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new RateLimitError('Too many requests. Try again later.', params.code))
    },
  })
}

/**
 * Limite general de la API.
 *
 * Se salta lo publico, que tiene el suyo: quien administra hace decenas de peticiones
 * por minuto y quien lee la web hace cientos, contando archivos. Con un solo numero,
 * o el panel va sobrado o los visitantes se quedan sin imagenes.
 */
export const globalRateLimit = crearLimitador({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  code: 'RATE_LIMITED',
  skip: (req) => req.path.startsWith('/api/public'),
})

/**
 * Limite del contenido publico, mas holgado.
 *
 * Sigue habiendo limite: sin el, cualquiera podria vaciar el archivo a base de
 * peticiones. Lo que cambia es el orden de magnitud, que es el que corresponde a leer
 * una web con imagenes.
 */
export const publicRateLimit = crearLimitador({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.PUBLIC_RATE_LIMIT_MAX,
  code: 'RATE_LIMITED',
})

/**
 * Limite estricto para el login (SEC-003). Se monta sobre las rutas de auth en la
 * Fase 2; se define aqui para que el contrato viva junto al resto de limitadores.
 */
export const loginRateLimit = crearLimitador({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  code: 'LOGIN_RATE_LIMITED',
})

/**
 * Limite de subidas. Cada peticion puede escribir decenas de megabytes en disco, asi
 * que se acota aparte del limite general aunque quien suba sea un administrador.
 */
export const uploadRateLimit = crearLimitador({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: 20,
  code: 'UPLOAD_RATE_LIMITED',
})
