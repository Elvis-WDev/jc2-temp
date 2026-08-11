import { Router } from 'express'
import type { TagUseCases } from '../../../../application/use-cases/tags/TagUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import {
  tagCreateSchema,
  tagDeleteQuerySchema,
  tagIdParamsSchema,
  tagListQuerySchema,
  tagUpdateSchema,
} from '../../schemas/tag.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'post',
  path: '/api/admin/tags',
  summary: 'Crea un tag',
  description:
    'El slug lo deriva el servidor del nombre. Si ya existe un tag con ese slug responde 409 e incluye su id en error.fields.existingTagId, para poder reutilizarlo (RF-007).',
  tags: ['Admin / Tags'],
  responses: {
    201: { description: 'Tag creado.' },
    401: respuestaError('Sin sesion.'),
    409: respuestaError('Ya existe un tag equivalente.'),
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/admin/tags/{id}',
  summary: 'Borra un tag',
  description: 'Responde 409 si esta en uso, salvo que se pase force=true.',
  tags: ['Admin / Tags'],
  responses: {
    204: { description: 'Borrado.' },
    401: respuestaError('Sin sesion.'),
    409: respuestaError('El tag esta en uso.'),
  },
})

export interface AdminTagsRouterDeps {
  tags: TagUseCases
}

export function createAdminTagsRouter(deps: AdminTagsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    validate({ query: tagListQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; category?: string; active?: boolean }
      >(req)
      return deps.tags.list(
        { page: query.page, page_size: query.page_size },
        {
          search: query.q ?? null,
          category: query.category ?? null,
          active: query.active ?? null,
        },
      )
    }),
  )

  router.post(
    '/',
    validate({ body: tagCreateSchema }),
    jsonHandler((req) => deps.tags.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  /**
   * Categorias en uso, para poder ofrecerlas como filtro.
   *
   * Va ANTES que `/:id` a proposito: Express resuelve por orden y `/:id` se tragaria
   * "categories" como si fuera un identificador.
   */
  router.get(
    '/categories',
    jsonHandler(() => deps.tags.listCategories()),
  )

  router.get(
    '/:id',
    validate({ params: tagIdParamsSchema }),
    jsonHandler((req) => deps.tags.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/:id',
    validate({ params: tagIdParamsSchema, body: tagUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.tags.update(params.id, body)
    }),
  )

  router.delete(
    '/:id',
    validate({ params: tagIdParamsSchema, query: tagDeleteQuerySchema }),
    noContentHandler((req) => {
      const { params, query } = validated<{ id: string }, { force: boolean }>(req)
      return deps.tags.delete(params.id, query.force)
    }),
  )

  return router
}
