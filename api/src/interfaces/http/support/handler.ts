import type { Request, RequestHandler } from 'express'
import { success } from '../../../shared/http/envelope.js'
import type { Paginated } from '../../../shared/http/pagination.js'

/**
 * Envuelve la logica de un endpoint para que los controladores no repitan el
 * `.then(...).catch(next)` en cada ruta.
 *
 * Tambien centraliza dos garantias: toda respuesta sale por `success()` con el mismo
 * envelope, y todo error acaba en el manejador central en lugar de convertirse en una
 * promesa rechazada sin capturar.
 */
export function jsonHandler<T>(
  fn: (req: Request) => Promise<T>,
  options: { status?: number } = {},
): RequestHandler {
  return (req, res, next) => {
    fn(req)
      .then((data) => {
        res.status(options.status ?? 200).json(success(data))
      })
      .catch(next)
  }
}

/** Variante para listados: los datos van en `data` y la paginacion en `meta`. */
export function paginatedHandler<T>(fn: (req: Request) => Promise<Paginated<T>>): RequestHandler {
  return (req, res, next) => {
    fn(req)
      .then((resultado) => {
        res.json(success(resultado.items, { pagination: resultado.pagination }))
      })
      .catch(next)
  }
}

/** Para operaciones sin cuerpo de respuesta (DELETE). */
export function noContentHandler(fn: (req: Request) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req)
      .then(() => {
        res.status(204).end()
      })
      .catch(next)
  }
}
