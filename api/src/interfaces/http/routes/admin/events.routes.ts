import { Router } from 'express'
import { LARGO_DE_TEXTO } from '../../../../shared/markdown/limites.js'
import type { Request } from 'express'
import type { EventUseCases } from '../../../../application/use-cases/events/EventUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry, z } from '../../openapi/registry.js'
import { patchSchemaOf, respuestaError } from '../../schemas/common.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

const idParamsSchema = z.object({ id: z.uuid() })

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  eventType: z.string().trim().max(50).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

const eventCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(220).default(''),
  eventType: z.string().trim().max(50).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  contentMarkdown: z.string().max(LARGO_DE_TEXTO.NORMAL).nullable().optional(),
  // Instante completo y no dia: un seminario tiene hora, y esa hora importa.
  startsAt: z.iso.datetime().transform((valor) => new Date(valor)),
  endsAt: z.iso
    .datetime()
    .transform((valor) => new Date(valor))
    .nullable()
    .optional(),
  location: z.string().trim().max(300).nullable().optional(),
  organizer: z.string().trim().max(300).nullable().optional(),
  imageMediaId: z.uuid().nullable().optional(),
  imageAlt: z.string().max(500).nullable().optional(),
  buttonLabel: z.string().trim().max(100).nullable().optional(),
  buttonUrl: z.url().nullable().optional(),
  // Color libre en hexadecimal: pertenece a la identidad del evento.
  buttonColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1d4ed8.')
    .nullable()
    .optional(),
  isMain: z.boolean().default(false),
  sortOrder: z.number().int().nullable().optional(),
  institutionIds: z.array(z.uuid()).optional(),
})

const eventUpdateSchema = patchSchemaOf(eventCreateSchema)

registry.registerPath({
  method: 'post',
  path: '/api/admin/events/{id}/publish',
  summary: 'Publica un evento',
  description: 'Unica puerta de la visibilidad publica (RN-001), igual que en trabajos y cursos.',
  tags: ['Admin / Events'],
  responses: {
    200: { description: 'Publicado.' },
    401: respuestaError('Sin sesion.'),
    404: respuestaError('No existe.'),
  },
})

function actor(req: Request) {
  return { userId: req.auth?.id ?? null, ipAddress: req.ip ?? null }
}

export interface AdminEventsRouterDeps {
  events: EventUseCases
}

export function createAdminEventsRouter(deps: AdminEventsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    validate({ query: listQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; eventType?: string; status?: string }
      >(req)
      return deps.events.list(
        { page: query.page, page_size: query.page_size },
        {
          search: query.q ?? null,
          eventType: query.eventType ?? null,
          editorialStatus: query.status ?? null,
        },
      )
    }),
  )

  router.post(
    '/',
    validate({ body: eventCreateSchema }),
    jsonHandler(
      (req) => deps.events.create(validated<unknown, unknown, never>(req).body, actor(req)),
      { status: 201 },
    ),
  )

  router.get(
    '/:id',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.events.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/:id',
    validate({ params: idParamsSchema, body: eventUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.events.update(params.id, body, actor(req))
    }),
  )

  router.delete(
    '/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) =>
      deps.events.delete(validated<{ id: string }>(req).params.id, actor(req)),
    ),
  )

  router.post(
    '/:id/publish',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.events.publish(validated<{ id: string }>(req).params.id, actor(req))),
  )

  router.post(
    '/:id/archive',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.events.archive(validated<{ id: string }>(req).params.id, actor(req))),
  )

  return router
}
