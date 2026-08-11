import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { AuthenticatedUser, SessionReader } from '../../../application/ports/SessionReader.js'
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/AppError.js'

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedUser
  }
}

/**
 * Exige sesion de administrador activa.
 *
 * Se monta sobre el router `/api/admin` COMPLETO, no ruta por ruta: un endpoint
 * nuevo nace protegido sin que nadie tenga que acordarse. Es la diferencia entre
 * una garantia y una costumbre.
 *
 * Recibe el lector de sesion por inyeccion, de modo que la capa HTTP no depende
 * del proveedor de autenticacion.
 */
export function createRequireAdmin(sessionReader: SessionReader): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    sessionReader
      .getAuthenticatedUser(req.headers)
      .then((user) => {
        if (user === null) {
          next(new UnauthorizedError('You must sign in to access this resource.'))
          return
        }

        // Una cuenta desactivada conserva su cookie hasta que expire; se comprueba
        // en cada peticion para que la desactivacion tenga efecto inmediato.
        if (!user.isActive) {
          next(new ForbiddenError('This account is disabled.', 'ACCOUNT_DISABLED'))
          return
        }

        if (user.role !== 'admin') {
          next(new ForbiddenError('Administrator role is required.', 'ADMIN_ROLE_REQUIRED'))
          return
        }

        req.auth = user
        next()
      })
      .catch(next)
  }
}
