import { Router } from 'express'
import type { GetPublicProfile } from '../../../../application/use-cases/public/GetPublicProfile.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import type { PageKey } from '../../../../application/ports/repositories/SiteContentRepository.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { pageKeyParamsSchema } from '../../schemas/profile.schemas.js'
import { jsonHandler } from '../../support/handler.js'
import { toPageContentDto, toPublicProfileDto } from '../../presenters/profile.presenter.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/profile',
  summary: 'Perfil publico del academico propietario',
  description: 'Devuelve el propietario del sitio, su afiliacion principal y sus enlaces publicos.',
  tags: ['Public / Profile'],
  responses: {
    200: { description: 'Perfil publico.' },
    404: respuestaError('El propietario no esta configurado.'),
  },
})

export interface PublicProfileRouterDeps {
  getPublicProfile: GetPublicProfile
  siteContent: SiteContentUseCases
  publicBaseUrl: string
}

export function createPublicProfileRouter(deps: PublicProfileRouterDeps): Router {
  const router = Router()

  router.get(
    '/profile',
    jsonHandler(async () => {
      const perfil = await deps.getPublicProfile.execute()
      // El presenter enumera campos uno a uno: nunca se serializa la entidad.
      return toPublicProfileDto(perfil, deps.publicBaseUrl)
    }),
  )

  router.get(
    '/pages/:pageKey',
    validate({ params: pageKeyParamsSchema }),
    jsonHandler(async (req) => {
      const { params } = validated<{ pageKey: PageKey }>(req)
      const pagina = await deps.siteContent.getPublishedPage(params.pageKey)
      return toPageContentDto(pagina, deps.publicBaseUrl)
    }),
  )

  return router
}
