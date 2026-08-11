import type { NextFunction, Request, Response } from 'express'
import { MethodNotAllowedError } from '../../../shared/errors/AppError.js'

const METODOS_PERMITIDOS = ['GET', 'HEAD', 'OPTIONS'] as const

/**
 * Capa 1 del blindaje publico (SEC-004, ERS §60.15).
 *
 * Se monta en la raiz del router `/api/public` y corta antes de resolver ninguna
 * ruta. Que un endpoint publico de escritura sea inalcanzable no depende de que
 * nadie lo registre por descuido: depende de esto.
 */
export function readOnly(req: Request, res: Response, next: NextFunction): void {
  if (!(METODOS_PERMITIDOS as readonly string[]).includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    next(new MethodNotAllowedError('The public API is read-only.'))
    return
  }
  next()
}
