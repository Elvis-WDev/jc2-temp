import { randomUUID } from 'node:crypto'
import { pinoHttp } from 'pino-http'
import { logger } from '../../../shared/logging/logger.js'

/**
 * Registra metodo, ruta, status y latencia por peticion, con un requestId estable
 * que se devuelve en la cabecera y se incrusta en el envelope de error (ERS §42, §48).
 *
 * Se respeta un `X-Request-Id` entrante para poder seguir una traza a traves de un
 * proxy, pero se acota su longitud: es entrada no confiable que acaba en los logs.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const entrante = req.headers['x-request-id']
    const id =
      typeof entrante === 'string' && entrante.length > 0 && entrante.length <= 128
        ? entrante
        : randomUUID()
    res.setHeader('X-Request-Id', id)
    return id
  },
  customLogLevel: (_req, res, err) => {
    if (err !== undefined || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  // El log de acceso no necesita volcar cabeceras completas.
  serializers: {
    req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
})
