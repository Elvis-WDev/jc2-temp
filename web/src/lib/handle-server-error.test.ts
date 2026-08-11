import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/api-error'
import { handleServerError } from './handle-server-error'

const toastError = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}))

function apiError(
  overrides: Partial<ConstructorParameters<typeof ApiError>[0]> = {}
) {
  return new ApiError({
    code: 'TAG_IN_USE',
    message: 'The tag is used by 3 works.',
    status: 409,
    requestId: 'req-abc',
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleServerError', () => {
  it('traduce un codigo conocido', () => {
    handleServerError(apiError())
    expect(toastError).toHaveBeenCalledWith('The tag is in use.')
  })

  it('cae al mensaje del servidor cuando el codigo no tiene traduccion', () => {
    handleServerError(
      apiError({ code: 'CODIGO_NUEVO', message: 'Algo concreto paso.' })
    )
    expect(toastError).toHaveBeenCalledWith('Algo concreto paso.')
  })

  it('un 500 muestra el requestId, que es lo unico que permite dar soporte', () => {
    handleServerError(
      apiError({
        code: 'INTERNAL_ERROR',
        message: 'ignorado',
        status: 500,
        requestId: 'req-xyz',
      })
    )

    expect(toastError).toHaveBeenCalledWith('Unexpected server error.', {
      description: 'Reference: req-xyz',
    })
  })

  it('no duplica en un toast los errores que el formulario ya pinta por campo', () => {
    handleServerError(
      apiError({
        code: 'WORK_VALIDATION_ERROR',
        status: 422,
        fields: { authors: 'At least one author is required.' },
      })
    )

    expect(toastError).not.toHaveBeenCalled()
  })

  it('un fallo de red se explica en lugar de decir "error"', () => {
    handleServerError(apiError({ code: 'NETWORK_ERROR', status: 0 }))
    expect(toastError).toHaveBeenCalledWith('The server could not be reached.')
  })

  it('convierte un error que no viene de la API', () => {
    handleServerError(new Error('roto'))
    expect(toastError).toHaveBeenCalledWith('roto')
  })
})
