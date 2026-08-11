import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'

/**
 * Repetir el identificador de una institucion respondia 500 "error inesperado, contacte
 * con soporte". Es un conflicto de datos que el usuario puede resolver solo, asi que
 * tiene que llegarle dicho.
 */

function responder(error: unknown) {
  const json = vi.fn()
  const res = { status: vi.fn(() => ({ json })), headersSent: false } as unknown as Response
  const req = { id: 'req-1', log: { warn: vi.fn(), error: vi.fn() } } as unknown as Request
  errorHandler(error, req, res, vi.fn())
  return {
    status: (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0],
    cuerpo: json.mock.calls[0]?.[0],
  }
}

/** Forma real del error con el adaptador de driver que usa el proyecto. */
function choqueDeUnicidad(columna: string) {
  return Object.assign(new Error('Unique constraint failed'), {
    code: 'P2002',
    meta: {
      modelName: 'Institution',
      driverAdapterError: {
        cause: { kind: 'UniqueConstraintViolation', constraint: { fields: [columna] } },
      },
    },
  })
}

describe('un valor repetido', () => {
  it('responde 409, no 500', () => {
    expect(responder(choqueDeUnicidad('slug')).status).toBe(409)
  })

  it('dice que campo choca, y lo marca para el formulario', () => {
    const { cuerpo } = responder(choqueDeUnicidad('slug'))
    expect(cuerpo.error.code).toBe('ALREADY_EXISTS')
    expect(cuerpo.error.message).toMatch(/identifier is already in use/)
    expect(cuerpo.error.fields).toEqual({ slug: 'This identifier is already in use.' })
  })

  it('si la columna no es de las conocidas, sigue siendo 409 con mensaje visible', () => {
    const { status, cuerpo } = responder(choqueDeUnicidad('alguna_otra'))
    expect(status).toBe(409)
    expect(cuerpo.error.message).not.toMatch(/unexpected/)
  })
})

describe('un fallo de verdad del servidor', () => {
  it('sigue siendo 500 y no filtra el mensaje original', () => {
    const { status, cuerpo } = responder(new Error('la contrasena de la base de datos es X'))
    expect(status).toBe(500)
    expect(cuerpo.error.message).not.toMatch(/contrasena/)
  })
})
