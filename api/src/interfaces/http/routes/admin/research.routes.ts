import { Router } from 'express'
import type { WorkUseCases } from '../../../../application/use-cases/research/WorkUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import {
  adminWorkQuerySchema,
  carouselBodySchema,
  featuredBodySchema,
  workCreateSchema,
  workIdParamsSchema,
  workUpdateSchema,
} from '../../schemas/research.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'
import type { Request } from 'express'
import type { WorkActor } from '../../../../application/use-cases/research/WorkUseCases.js'

registry.registerPath({
  method: 'post',
  path: '/api/admin/works/{id}/publish',
  summary: 'Publica un trabajo',
  description: 'Falla con 422 si el trabajo no tiene al menos un autor (RN-002).',
  tags: ['Admin / Research'],
  responses: {
    200: { description: 'Publicado.' },
    401: respuestaError('Sin sesion.'),
    422: respuestaError('Faltan autores.'),
  },
})

/** Quien hace el cambio y desde donde, para el registro de auditoria (ERS §27). */
function actor(req: Request): WorkActor {
  return { userId: req.auth?.id ?? null, ipAddress: req.ip ?? null }
}

export interface AdminResearchRouterDeps {
  works: WorkUseCases
}

export function createAdminResearchRouter(deps: AdminResearchRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    validate({ query: adminWorkQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; status?: string }
      >(req)
      return deps.works.list(
        { page: query.page, page_size: query.page_size },
        { search: query.q ?? null, editorialStatus: query.status ?? null },
      )
    }),
  )

  router.post(
    '/',
    validate({ body: workCreateSchema }),
    jsonHandler(
      (req) => deps.works.create(validated<unknown, unknown, never>(req).body, actor(req)),
      {
        status: 201,
      },
    ),
  )

  router.get(
    '/:id',
    validate({ params: workIdParamsSchema }),
    jsonHandler((req) => deps.works.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/:id',
    validate({ params: workIdParamsSchema, body: workUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.works.update(params.id, body, actor(req))
    }),
  )

  router.delete(
    '/:id',
    validate({ params: workIdParamsSchema }),
    noContentHandler((req) =>
      deps.works.delete(validated<{ id: string }>(req).params.id, actor(req)),
    ),
  )

  router.post(
    '/:id/publish',
    validate({ params: workIdParamsSchema }),
    jsonHandler((req) => deps.works.publish(validated<{ id: string }>(req).params.id, actor(req))),
  )

  router.post(
    '/:id/archive',
    validate({ params: workIdParamsSchema }),
    jsonHandler((req) => deps.works.archive(validated<{ id: string }>(req).params.id, actor(req))),
  )

  router.post(
    '/:id/carousel',
    validate({ params: workIdParamsSchema, body: carouselBodySchema }),
    jsonHandler((req) => {
      const { params, body } = validated<
        { id: string },
        unknown,
        { isCarousel: boolean; carouselOrder: number | null }
      >(req)
      return deps.works.setCarousel(params.id, body.isCarousel, body.carouselOrder)
    }),
  )

  router.post(
    '/:id/featured',
    validate({ params: workIdParamsSchema, body: featuredBodySchema }),
    jsonHandler((req) => {
      const { params, body } = validated<
        { id: string },
        unknown,
        { isFeatured: boolean; featuredOrder: number | null }
      >(req)
      return deps.works.setFeatured(params.id, body.isFeatured, body.featuredOrder)
    }),
  )

  return router
}
