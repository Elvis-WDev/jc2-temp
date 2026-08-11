import type { NextFunction, Request, Response } from 'express'
import { NotFoundError } from '../../../shared/errors/AppError.js'

/** Se monta despues de todas las rutas y antes del manejador de errores. */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError('The requested endpoint does not exist.', 'ENDPOINT_NOT_FOUND'))
}
