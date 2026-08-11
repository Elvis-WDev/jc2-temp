import { Router } from 'express'
import type { VenueUseCases } from '../../../../application/use-cases/research/VenueUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry, z } from '../../openapi/registry.js'
import { patchSchemaOf, respuestaError } from '../../schemas/common.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

const idParamsSchema = z.object({ id: z.uuid() })

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  venueType: z.string().trim().max(50).optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

const venueCreateSchema = z.object({
  name: z.string().trim().min(1).max(300),
  abbreviation: z.string().trim().max(100).nullable().optional(),
  venueType: z.string().trim().max(50).nullable().optional(),
  publisherName: z.string().trim().max(300).nullable().optional(),
  issn: z.string().trim().max(20).nullable().optional(),
  isbnPrefix: z.string().trim().max(30).nullable().optional(),
  countryCode: z.string().trim().length(2).nullable().optional(),
  websiteUrl: z.url().nullable().optional(),
  // Texto: cada escala usa su notacion (Q1, A*, 4*).
  ranking: z.string().trim().max(50).nullable().optional(),
  citeScore: z.number().min(0).max(9999).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

const venueUpdateSchema = patchSchemaOf(venueCreateSchema)

registry.registerPath({
  method: 'get',
  path: '/api/admin/venues',
  summary: 'Lista revistas y editoriales',
  description:
    'Fichas reutilizables con ISSN, pais, ranking y CiteScore. Lo que cambia por articulo (volumen, paginas, ano) vive en el trabajo.',
  tags: ['Admin / Research'],
  responses: {
    200: { description: 'Paginado.' },
    401: respuestaError('Sin sesion.'),
  },
})

export interface AdminVenuesRouterDeps {
  venues: VenueUseCases
}

export function createAdminVenuesRouter(deps: AdminVenuesRouterDeps): Router {
  const router = Router()

  router.get(
    '/venues',
    validate({ query: listQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; venueType?: string; active?: boolean }
      >(req)
      return deps.venues.list(
        { page: query.page, page_size: query.page_size },
        {
          search: query.q ?? null,
          venueType: query.venueType ?? null,
          active: query.active ?? null,
        },
      )
    }),
  )

  router.post(
    '/venues',
    validate({ body: venueCreateSchema }),
    jsonHandler((req) => deps.venues.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.get(
    '/venues/:id',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.venues.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/venues/:id',
    validate({ params: idParamsSchema, body: venueUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.venues.update(params.id, body)
    }),
  )

  router.delete(
    '/venues/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.venues.delete(validated<{ id: string }>(req).params.id)),
  )

  return router
}
