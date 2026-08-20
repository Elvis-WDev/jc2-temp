import { Router } from 'express'
import type { GetHomePage } from '../../../../application/use-cases/public/GetHomePage.js'
import { registry } from '../../openapi/registry.js'
import { jsonHandler } from '../../support/handler.js'
import { toPageContentDto, toPublicProfileDto } from '../../presenters/profile.presenter.js'
import { toPublicPostDto } from '../../presenters/posts.presenter.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/home',
  summary: 'Todo lo que Home necesita en una sola llamada',
  description:
    'Perfil, trayectoria, textos de la pagina y lo ultimo de News y Blog. ERS §30: no obligar al frontend a hacer cinco peticiones. La cabecera y el pie van en /api/public/site.',
  tags: ['Public / Home'],
  responses: { 200: { description: 'Contenido agregado de Home.' } },
})

export interface PublicHomeRouterDeps {
  home: GetHomePage
  publicBaseUrl: string
}

export function createPublicHomeRouter(deps: PublicHomeRouterDeps): Router {
  const router = Router()

  router.get(
    '/home',
    jsonHandler(async () => {
      const home = await deps.home.execute()

      return {
        profile: toPublicProfileDto(home.profile, deps.publicBaseUrl),
        // Vacia si el titular oculto los textos: la portada sigue, sin ellos.
        page: home.page === null ? null : toPageContentDto(home.page, deps.publicBaseUrl),
        // La misma ficha que sirve `/api/public/posts`: la portada ensena un resumen de
        // cada una, pero componer aqui un DTO mas pequeno seria una lista blanca mas que
        // mantener al dia, y son tres entradas.
        latestNews: home.latestNews.map((entrada) =>
          toPublicPostDto(entrada, deps.publicBaseUrl, home.postKindLabels),
        ),
        sections: home.sections,
      }
    }),
  )

  return router
}
