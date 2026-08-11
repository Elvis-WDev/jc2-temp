import { Router } from 'express'
import type { PublicTeachingUseCases } from '../../../../application/use-cases/teaching/PublicTeachingUseCases.js'
import { success } from '../../../../shared/http/envelope.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import { requirePageVisible } from '../../middlewares/pageVisible.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { courseRefParamsSchema, publicTeachingQuerySchema } from '../../schemas/teaching.schemas.js'
import { jsonHandler } from '../../support/handler.js'
import {
  toPublicCourseDetailDto,
  toPublicCourseSummaryDto,
} from '../../presenters/teaching.presenter.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/teaching',
  summary: 'Cursos publicados con filtros, paginacion y facets',
  description:
    'Filtra por texto, institucion, departamento, tag y solo-activos. Los filtros se aplican sobre ediciones publicadas.',
  tags: ['Public / Teaching'],
  responses: { 200: { description: 'Listado con paginacion y facets.' } },
})

registry.registerPath({
  method: 'get',
  path: '/api/public/teaching/{idOrSlug}',
  summary: 'Detalle de un curso publicado con sus ediciones y materiales publicos',
  tags: ['Public / Teaching'],
  responses: {
    200: { description: 'Curso con ediciones publicadas y materiales publicos.' },
    404: respuestaError('No existe o no esta publicado.'),
  },
})

export interface PublicTeachingRouterDeps {
  teaching: PublicTeachingUseCases
  siteContent: SiteContentUseCases
  publicBaseUrl: string
}

type Query = {
  q?: string
  institution?: string
  department?: string
  active?: boolean
  tag?: string
  sort: 'newest' | 'title'
  page: number
  page_size: number
}

export function createPublicTeachingRouter(deps: PublicTeachingRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    requirePageVisible(deps.siteContent, 'teaching'),
    validate({ query: publicTeachingQuerySchema }),
    (req, res, next) => {
      const { query } = validated<unknown, Query>(req)

      deps.teaching
        .list(
          { page: query.page, page_size: query.page_size },
          {
            q: query.q ?? null,
            institution: query.institution ?? null,
            department: query.department ?? null,
            activeOnly: query.active === true,
            tag: query.tag ?? null,
            sort: query.sort,
          },
        )
        .then((resultado) => {
          res.json(
            success(resultado.items.map(toPublicCourseSummaryDto), {
              pagination: resultado.pagination,
              facets: resultado.facets,
            }),
          )
        })
        .catch(next)
    },
  )

  router.get(
    '/:idOrSlug',
    validate({ params: courseRefParamsSchema }),
    jsonHandler(async (req) => {
      const { params } = validated<{ idOrSlug: string }>(req)
      const curso = await deps.teaching.get(params.idOrSlug)
      return toPublicCourseDetailDto(curso, deps.publicBaseUrl)
    }),
  )

  return router
}
