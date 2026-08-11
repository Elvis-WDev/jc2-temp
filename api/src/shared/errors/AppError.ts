/**
 * Taxonomia de errores de la aplicacion.
 *
 * El middleware de errores es el UNICO punto que traduce estas clases a HTTP.
 * Ninguna capa devuelve codigos de estado por su cuenta.
 *
 * `code` es configurable por instancia para poder emitir codigos por modulo
 * (`WORK_VALIDATION_ERROR`, `WORK_NOT_FOUND`, ...) tal como pide ERS §48.
 */

export type FieldErrors = Record<string, string>

export class AppError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly fields: FieldErrors | undefined
  /** Un error esperado del flujo (validacion, permisos). Los no operacionales se alertan. */
  readonly isOperational: boolean

  constructor(params: {
    code: string
    message: string
    httpStatus: number
    fields?: FieldErrors
    isOperational?: boolean
    cause?: unknown
  }) {
    super(params.message, params.cause === undefined ? undefined : { cause: params.cause })
    this.name = new.target.name
    this.code = params.code
    this.httpStatus = params.httpStatus
    this.fields = params.fields
    this.isOperational = params.isOperational ?? true
    Error.captureStackTrace?.(this, new.target)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: FieldErrors, code = 'VALIDATION_ERROR') {
    super({ code, message, httpStatus: 422, fields })
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required.', code = 'UNAUTHORIZED') {
    super({ code, message, httpStatus: 401 })
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.', code = 'FORBIDDEN') {
    super({ code, message, httpStatus: 403 })
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.', code = 'NOT_FOUND') {
    super({ code, message, httpStatus: 404 })
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', fields?: FieldErrors) {
    super({ code, message, httpStatus: 409, fields })
  }
}

export class MethodNotAllowedError extends AppError {
  constructor(message = 'This endpoint is read-only.', code = 'METHOD_NOT_ALLOWED') {
    super({ code, message, httpStatus: 405 })
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'The uploaded file is too large.', code = 'PAYLOAD_TOO_LARGE') {
    super({ code, message, httpStatus: 413 })
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again later.', code = 'RATE_LIMITED') {
    super({ code, message, httpStatus: 429 })
  }
}

/** Fallo inesperado. Su `message` nunca llega al cliente. */
export class InternalError extends AppError {
  constructor(message = 'Unexpected error.', cause?: unknown) {
    super({ code: 'INTERNAL_ERROR', message, httpStatus: 500, isOperational: false, cause })
  }
}
