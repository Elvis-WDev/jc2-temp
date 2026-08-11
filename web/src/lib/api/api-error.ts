import { AxiosError } from 'axios'

/**
 * Error de la API en la forma que define ERS §48:
 *
 *   { error: { code, message, fields?, requestId } }
 *
 * Tenerlo tipado permite reaccionar al `code` —que es estable y parte del contrato—
 * en lugar de adivinar por el estado HTTP, que es ambiguo: un 409 puede ser un tag
 * duplicado o un archivo en uso, y la interfaz debe responder distinto a cada uno.
 */

export interface ApiErrorPayload {
  code: string
  message: string
  fields?: Record<string, string>
  requestId: string
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields: Record<string, string>
  readonly requestId: string

  constructor(params: {
    code: string
    message: string
    status: number
    fields?: Record<string, string>
    requestId: string
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.fields = params.fields ?? {}
    this.requestId = params.requestId
  }

  /** Errores de validación por campo, para volcarlos en el formulario. */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fields).length > 0
  }

  /**
   * Un 500 no lleva detalle: el backend devuelve un mensaje genérico a propósito y
   * registra la traza real con este `requestId`. Es lo único útil para soporte.
   */
  get isUnexpected(): boolean {
    return this.status >= 500
  }
}

function isApiErrorPayload(
  value: unknown
): value is { error: ApiErrorPayload } {
  if (typeof value !== 'object' || value === null) return false
  const envelope = value as { error?: unknown }
  if (typeof envelope.error !== 'object' || envelope.error === null)
    return false
  const error = envelope.error as Record<string, unknown>
  return typeof error.code === 'string' && typeof error.message === 'string'
}

/**
 * Convierte cualquier fallo de axios en un `ApiError`.
 *
 * Cubre también los casos en que no hay envelope: sin red, o un proxy que responde
 * HTML. Ahí se fabrica un código sintético para que el resto del código pueda tratar
 * todos los fallos igual.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof AxiosError) {
    const payload: unknown = error.response?.data

    if (isApiErrorPayload(payload)) {
      return new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status: error.response?.status ?? 0,
        fields: payload.error.fields,
        requestId: payload.error.requestId,
      })
    }

    // Sin respuesta: la petición no llegó a salir o el servidor no responde.
    if (error.response === undefined) {
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'The server could not be reached.',
        status: 0,
        requestId: '',
      })
    }

    return new ApiError({
      code: 'UNEXPECTED_RESPONSE',
      message: error.message,
      status: error.response.status,
      requestId: '',
    })
  }

  return new ApiError({
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error.',
    status: 0,
    requestId: '',
  })
}
