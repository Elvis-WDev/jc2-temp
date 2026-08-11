import type { FieldErrors } from '../errors/AppError.js'

/**
 * Envelope unico de respuesta (backend.md:58-59, ERS §48).
 * Ninguna ruta serializa una forma distinta.
 */

export interface SuccessEnvelope<T, M = unknown> {
  data: T
  meta?: M
}

export interface ErrorEnvelope {
  error: {
    code: string
    message: string
    fields?: FieldErrors
    requestId: string
  }
}

export function success<T>(data: T): SuccessEnvelope<T>
export function success<T, M>(data: T, meta: M): SuccessEnvelope<T, M>
export function success<T, M>(data: T, meta?: M): SuccessEnvelope<T, M> {
  return meta === undefined ? { data } : { data, meta }
}

export function failure(params: {
  code: string
  message: string
  requestId: string
  fields?: FieldErrors
}): ErrorEnvelope {
  return {
    error: {
      code: params.code,
      message: params.message,
      ...(params.fields === undefined ? {} : { fields: params.fields }),
      requestId: params.requestId,
    },
  }
}
