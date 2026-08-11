import { Router } from 'express'
import type { GetPublicSite } from '../../../../application/use-cases/public/GetPublicSite.js'
import { registry } from '../../openapi/registry.js'
import { toPublicSiteDto } from '../../presenters/site.presenter.js'
import { jsonHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/site',
  summary: 'Cabecera, pie y ajustes visibles del sitio',
  description:
    'Lo que es igual en todas las paginas: nombre, emblema, pie, enlaces academicos del titular, interruptores de filtros y valores por defecto de SEO. Evita que Research o Teaching tengan que pedir la portada entera para pintar su pie.',
  tags: ['Public / Site'],
  responses: { 200: { description: 'Configuracion publica del sitio.' } },
})

export interface PublicSiteRouterDeps {
  site: GetPublicSite
  publicBaseUrl: string
}

export function createPublicSiteRouter(deps: PublicSiteRouterDeps): Router {
  const router = Router()

  router.get(
    '/site',
    jsonHandler(async () => toPublicSiteDto(await deps.site.execute(), deps.publicBaseUrl)),
  )

  return router
}
