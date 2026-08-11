import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType } from 'zod'
import { ZodError } from 'zod'
import { ValidationError, type FieldErrors } from '../../../shared/errors/AppError.js'

/**
 * Validacion de entrada en la frontera HTTP (security/principles.md:5).
 * Ninguna ruta lee `req.body`, `req.query` o `req.params` sin pasar por aqui.
 *
 * El resultado se guarda en `req.validated` y no se reasigna sobre `req.query`:
 * en Express 5 `req.query` es un getter y asignarlo lanza.
 */

export interface ValidatedData<P = unknown, Q = unknown, B = unknown> {
  params: P
  query: Q
  body: B
}

declare module 'express-serve-static-core' {
  interface Request {
    validated?: ValidatedData
  }
}

export interface ValidationSchemas<P, Q, B> {
  params?: ZodType<P>
  query?: ZodType<Q>
  body?: ZodType<B>
}

export function zodIssuesToFields(error: ZodError): FieldErrors {
  const fields: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_'
    // Se conserva el primer mensaje por campo: el resto suele ser ruido derivado.
    fields[key] ??= issue.message
  }
  return fields
}

export function validate<P = unknown, Q = unknown, B = unknown>(
  schemas: ValidationSchemas<P, Q, B>,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated: ValidatedData = {
        params: schemas.params ? schemas.params.parse(req.params) : req.params,
        query: schemas.query ? schemas.query.parse(req.query) : req.query,
        body: schemas.body ? schemas.body.parse(req.body) : req.body,
      }
      req.validated = validated
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('The request payload is invalid.', zodIssuesToFields(error)))
        return
      }
      next(error)
    }
  }
}

/**
 * Accesor tipado del resultado. El generico lo aporta quien llama, que es tambien
 * quien declaro los esquemas en la ruta.
 */
export function validated<P = unknown, Q = unknown, B = unknown>(
  req: Request,
): ValidatedData<P, Q, B> {
  if (req.validated === undefined) {
    throw new Error('validate() no se monto en esta ruta antes del controlador.')
  }
  return req.validated as ValidatedData<P, Q, B>
}
