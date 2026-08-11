import { Router } from 'express'
import type { PublicResearchUseCases } from '../../../../application/use-cases/research/PublicResearchUseCases.js'
import type { ResearchSort } from '../../../../application/ports/repositories/PublicWorkRepository.js'
import { success } from '../../../../shared/http/envelope.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import { requirePageVisible } from '../../middlewares/pageVisible.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { publicResearchQuerySchema, workRefParamsSchema } from '../../schemas/research.schemas.js'
import { jsonHandler } from '../../support/handler.js'
import {
  toPublicWorkDetailDto,
  toPublicWorkSummaryDto,
} from '../../presenters/research.presenter.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/research',
  summary: 'Lista de trabajos publicados con filtros, paginacion y facets',
  description:
    'Filtra por texto, tipo, estado academico, rango de anos y tag. Todo se resuelve en el servidor (PERF-001). Las facets se calculan sobre el mismo conjunto filtrado.',
  tags: ['Public / Research'],
  responses: { 200: { description: 'Listado con paginacion y facets.' } },
})

registry.registerPath({
  method: 'get',
  path: '/api/public/research/{idOrSlug}',
  summary: 'Detalle de un trabajo publicado',
  tags: ['Public / Research'],
  responses: {
    200: { description: 'Detalle con cita y BibTeX.' },
    404: respuestaError('No existe o no esta publicado.'),
  },
})

export interface PublicResearchRouterDeps {
  research: PublicResearchUseCases
  siteContent: SiteContentUseCases
  publicBaseUrl: string
}

type Query = {
  q?: string
  type?: string
  status?: string
  year_from?: number
  year_to?: number
  tag?: string
  sort: ResearchSort
  page: number
  page_size: number
}

export function createPublicResearchRouter(deps: PublicResearchRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    // Ocultar la seccion apaga su indice, no sus fichas.
    requirePageVisible(deps.siteContent, 'research'),
    validate({ query: publicResearchQuerySchema }),
    (req, res, next) => {
      const { query } = validated<unknown, Query>(req)

      deps.research
        .list(
          { page: query.page, page_size: query.page_size },
          {
            q: query.q ?? null,
            type: query.type ?? null,
            status: query.status ?? null,
            yearFrom: query.year_from ?? null,
            yearTo: query.year_to ?? null,
            tag: query.tag ?? null,
            sort: query.sort,
          },
        )
        .then((resultado) => {
          res.json(
            success(
              resultado.items.map((work) => toPublicWorkSummaryDto(work, deps.publicBaseUrl)),
              {
                pagination: resultado.pagination,
                facets: resultado.facets,
              },
            ),
          )
        })
        .catch(next)
    },
  )

  router.get(
    '/:idOrSlug',
    validate({ params: workRefParamsSchema }),
    jsonHandler(async (req) => {
      const { params } = validated<{ idOrSlug: string }>(req)
      const detalle = await deps.research.get(params.idOrSlug)
      return toPublicWorkDetailDto(detalle, deps.publicBaseUrl)
    }),
  )

  return router
}
