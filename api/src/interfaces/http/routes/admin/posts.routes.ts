import { Router } from 'express'
import type { Request } from 'express'
import type { PostUseCases } from '../../../../application/use-cases/posts/PostUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { toAdminPostDto } from '../../presenters/posts.presenter.js'
import {
  postCreateSchema,
  postIdParamsSchema,
  postListQuerySchema,
  postUpdateSchema,
} from '../../schemas/posts.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'post',
  path: '/api/admin/posts/{id}/publish',
  summary: 'Publica una noticia o entrada de blog',
  description: 'Unica puerta de la visibilidad publica (RN-001), igual que en trabajos y eventos.',
  tags: ['Admin / Posts'],
  responses: {
    200: { description: 'Publicada.' },
    401: respuestaError('Sin sesion.'),
    404: respuestaError('No existe.'),
  },
})

function actor(req: Request) {
  return { userId: req.auth?.id ?? null, ipAddress: req.ip ?? null }
}

export interface AdminPostsRouterDeps {
  posts: PostUseCases
}

export function createAdminPostsRouter(deps: AdminPostsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    validate({ query: postListQuerySchema }),
    paginatedHandler(async (req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; kind?: string; status?: string }
      >(req)
      const pagina = await deps.posts.list(
        { page: query.page, page_size: query.page_size },
        {
          search: query.q ?? null,
          kind: query.kind ?? null,
          editorialStatus: query.status ?? null,
        },
      )
      return { ...pagina, items: pagina.items.map(toAdminPostDto) }
    }),
  )

  router.post(
    '/',
    validate({ body: postCreateSchema }),
    jsonHandler(
      async (req) =>
        toAdminPostDto(
          await deps.posts.create(validated<unknown, unknown, never>(req).body, actor(req)),
        ),
      { status: 201 },
    ),
  )

  router.get(
    '/:id',
    validate({ params: postIdParamsSchema }),
    jsonHandler(async (req) =>
      toAdminPostDto(await deps.posts.get(validated<{ id: string }>(req).params.id)),
    ),
  )

  router.patch(
    '/:id',
    validate({ params: postIdParamsSchema, body: postUpdateSchema }),
    jsonHandler(async (req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return toAdminPostDto(await deps.posts.update(params.id, body, actor(req)))
    }),
  )

  router.delete(
    '/:id',
    validate({ params: postIdParamsSchema }),
    noContentHandler((req) =>
      deps.posts.delete(validated<{ id: string }>(req).params.id, actor(req)),
    ),
  )

  router.post(
    '/:id/publish',
    validate({ params: postIdParamsSchema }),
    jsonHandler(async (req) =>
      toAdminPostDto(
        await deps.posts.publish(validated<{ id: string }>(req).params.id, actor(req)),
      ),
    ),
  )

  router.post(
    '/:id/archive',
    validate({ params: postIdParamsSchema }),
    jsonHandler(async (req) =>
      toAdminPostDto(
        await deps.posts.archive(validated<{ id: string }>(req).params.id, actor(req)),
      ),
    ),
  )

  return router
}
