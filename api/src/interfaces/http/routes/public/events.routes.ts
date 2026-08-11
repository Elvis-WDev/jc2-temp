import { Router } from 'express'
import type { PublicEventUseCases } from '../../../../application/use-cases/events/EventUseCases.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import { requirePageVisible } from '../../middlewares/pageVisible.js'
import { validate, validated } from '../../middlewares/validate.js'
import { z } from '../../openapi/registry.js'
import { toPublicEventDto } from '../../presenters/events.presenter.js'
import { paginatedHandler, jsonHandler } from '../../support/handler.js'

const listQuerySchema = z.object({
  type: z.string().trim().max(50).optional(),
  // `upcoming=true` son los que no han terminado todavia.
  upcoming: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

const refParamsSchema = z.object({ idOrSlug: z.string().trim().min(1).max(220) })

export interface PublicEventsRouterDeps {
  events: PublicEventUseCases
  siteContent: SiteContentUseCases
  publicBaseUrl: string
}

export function createPublicEventsRouter(deps: PublicEventsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    requirePageVisible(deps.siteContent, 'events'),
    validate({ query: listQuerySchema }),
    paginatedHandler(async (req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; type?: string; upcoming?: boolean }
      >(req)
      const pagina = await deps.events.list(
        { page: query.page, page_size: query.page_size },
        { eventType: query.type ?? null, upcoming: query.upcoming ?? null },
      )
      return {
        ...pagina,
        items: pagina.items.map((evento) =>
          toPublicEventDto(evento, deps.publicBaseUrl, pagina.typeLabels),
        ),
      }
    }),
  )

  router.get(
    '/:idOrSlug',
    validate({ params: refParamsSchema }),
    jsonHandler(async (req) => {
      const { params } = validated<{ idOrSlug: string }>(req)
      const detalle = await deps.events.get(params.idOrSlug)
      return toPublicEventDto(detalle.event, deps.publicBaseUrl, detalle.typeLabels)
    }),
  )

  return router
}
