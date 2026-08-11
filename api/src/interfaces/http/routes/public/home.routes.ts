import { Router } from 'express'
import type { GetHomePage } from '../../../../application/use-cases/public/GetHomePage.js'
import { registry } from '../../openapi/registry.js'
import { jsonHandler } from '../../support/handler.js'
import { toPageContentDto, toPublicProfileDto } from '../../presenters/profile.presenter.js'
import { toPublicWorkSummaryDto } from '../../presenters/research.presenter.js'
import { toPublicCourseSummaryDto } from '../../presenters/teaching.presenter.js'
import { toPublicEventDto } from '../../presenters/events.presenter.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/home',
  summary: 'Todo lo que Home necesita en una sola llamada',
  description:
    'Perfil, textos de la pagina, trabajos y cursos destacados. ERS §30: no obligar al frontend a hacer cinco peticiones. La cabecera y el pie van en /api/public/site.',
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
        carouselWorks: home.carouselWorks.map((work) =>
          toPublicWorkSummaryDto(work, deps.publicBaseUrl),
        ),
        featuredWorks: home.featuredWorks.map((work) =>
          toPublicWorkSummaryDto(work, deps.publicBaseUrl),
        ),
        featuredCourses: home.featuredCourses.map(toPublicCourseSummaryDto),
        events: home.events.map((evento) =>
          toPublicEventDto(evento, deps.publicBaseUrl, home.eventTypeLabels),
        ),
        sections: home.sections,
      }
    }),
  )

  return router
}
