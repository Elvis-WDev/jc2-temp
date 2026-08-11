import { Router } from 'express'
import type { CitationUseCases } from '../../../../application/use-cases/citations/CitationUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry, z } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { jsonHandler, noContentHandler } from '../../support/handler.js'

const idParamsSchema = z.object({ id: z.uuid() })

const listQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
})

const styleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use lowercase words separated by underscores.'),
  name: z.string().trim().min(1).max(100),
  extension: z
    .string()
    .trim()
    .max(20)
    .regex(/^[a-z0-9]+$/, 'Only lowercase letters and digits, without the dot.')
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/** Sin `code`: es lo que identifica al estilo en las citas ya escritas. */
const styleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  extension: z.string().trim().max(20).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const citationParamsSchema = z.object({ workId: z.uuid(), styleId: z.uuid() })
const citationBodySchema = z.object({ content: z.string().trim().min(1).max(20000) })

registry.registerPath({
  method: 'put',
  path: '/api/admin/works/{workId}/citations/{styleId}',
  summary: 'Escribe la cita de un trabajo en un estilo',
  description:
    'Crea o reemplaza. El BibTeX generado por el sistema no se toca: esto es para ofrecer la forma de citar que publica la editorial.',
  tags: ['Admin / Research'],
  responses: {
    200: { description: 'Guardada.' },
    401: respuestaError('Sin sesion.'),
    404: respuestaError('El estilo no existe.'),
  },
})

export interface AdminCitationsRouterDeps {
  citations: CitationUseCases
}

export function createAdminCitationsRouter(deps: AdminCitationsRouterDeps): Router {
  const router = Router()

  router.get(
    '/citation-styles',
    validate({ query: listQuerySchema }),
    jsonHandler((req) =>
      deps.citations.listStyles(
        validated<unknown, { active?: boolean }>(req).query.active === true,
      ),
    ),
  )

  router.post(
    '/citation-styles',
    validate({ body: styleCreateSchema }),
    jsonHandler((req) => deps.citations.createStyle(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.patch(
    '/citation-styles/:id',
    validate({ params: idParamsSchema, body: styleUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.citations.updateStyle(params.id, body)
    }),
  )

  router.delete(
    '/citation-styles/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.citations.deleteStyle(validated<{ id: string }>(req).params.id)),
  )

  router.get(
    '/works/:workId/citations',
    validate({ params: z.object({ workId: z.uuid() }) }),
    jsonHandler((req) =>
      deps.citations.listByWork(validated<{ workId: string }>(req).params.workId),
    ),
  )

  // PUT y no POST: escribir la cita de un trabajo en un estilo es idempotente, y no hay
  // dos citas del mismo trabajo en el mismo estilo.
  router.put(
    '/works/:workId/citations/:styleId',
    validate({ params: citationParamsSchema, body: citationBodySchema }),
    jsonHandler((req) => {
      const { params, body } = validated<
        { workId: string; styleId: string },
        unknown,
        { content: string }
      >(req)
      return deps.citations.save(params.workId, params.styleId, body.content)
    }),
  )

  router.delete(
    '/works/:workId/citations/:styleId',
    validate({ params: citationParamsSchema }),
    noContentHandler((req) => {
      const { params } = validated<{ workId: string; styleId: string }>(req)
      return deps.citations.remove(params.workId, params.styleId)
    }),
  )

  return router
}
