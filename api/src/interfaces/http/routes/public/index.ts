import { Router } from 'express'
import type { MediaControllerDeps } from '../../controllers/media.controller.js'
import { publicCache } from '../../middlewares/publicCache.js'
import { readOnly } from '../../middlewares/readOnly.js'
import { createPublicMediaRouter } from './media.routes.js'
import { createPublicProfileRouter, type PublicProfileRouterDeps } from './profile.routes.js'
import { createPublicResearchRouter, type PublicResearchRouterDeps } from './research.routes.js'
import { createPublicEventsRouter, type PublicEventsRouterDeps } from './events.routes.js'
import { createPublicPostsRouter, type PublicPostsRouterDeps } from './posts.routes.js'
import { createPublicHomeRouter, type PublicHomeRouterDeps } from './home.routes.js'
import { createPublicSiteRouter, type PublicSiteRouterDeps } from './site.routes.js'
import { createPublicSitemapRouter, type PublicSitemapRouterDeps } from './sitemap.routes.js'
import { createPublicTeachingRouter, type PublicTeachingRouterDeps } from './teaching.routes.js'

export interface PublicRouterDeps {
  media: MediaControllerDeps
  profile: PublicProfileRouterDeps
  research: PublicResearchRouterDeps
  teaching: PublicTeachingRouterDeps
  home: PublicHomeRouterDeps
  site: PublicSiteRouterDeps
  sitemap: PublicSitemapRouterDeps
  events: PublicEventsRouterDeps
  posts: PublicPostsRouterDeps
}

/**
 * Router publico (`/api/public`). Todo lo que cuelgue de aqui es de solo lectura.
 *
 * `readOnly` se monta en la raiz, antes que ninguna ruta: aunque alguien registrase
 * por error un POST mas abajo, seria inalcanzable. Ver plan seccion 5, capa 1.
 */
export function createPublicRouter(deps: PublicRouterDeps): Router {
  const router = Router()

  router.use(readOnly)

  // helmet responde `Cross-Origin-Resource-Policy: same-origin` en toda la API, y esa
  // cabecera hace que el navegador se niegue a PINTAR la respuesta si el documento
  // viene de otro origen. Para el panel es lo correcto. Para esto no: aqui todo es,
  // por definicion, publico, y si la web se despliega en un origen distinto del de la
  // API, la foto del perfil, las portadas y las figuras se quedarian en blanco sin
  // ningun error visible en la consola de red.
  //
  // Aflojarla NO abre nada: lo que cuelga de este router ya paso por RN-001 y por la
  // lista blanca de los presenters. El administrativo se queda como estaba.
  router.use((_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
  })

  // PERF-004: un minuto de cache con revalidacion. El ETag lo genera Express en
  // res.json(), asi que un 304 sigue siendo barato cuando nada ha cambiado.
  router.use(publicCache(60))

  router.use('/media', createPublicMediaRouter(deps.media))
  router.use('/research', createPublicResearchRouter(deps.research))
  router.use('/teaching', createPublicTeachingRouter(deps.teaching))
  router.use('/events', createPublicEventsRouter(deps.events))
  router.use('/posts', createPublicPostsRouter(deps.posts))
  router.use('/', createPublicHomeRouter(deps.home))
  // La cabecera, el pie y los interruptores: es lo que el titular acaba de tocar y va
  // a mirar enseguida. Media vida de cache y a preguntar.
  router.use('/', publicCache(30), createPublicSiteRouter(deps.site))
  router.use('/', createPublicSitemapRouter(deps.sitemap))
  router.use('/', createPublicProfileRouter(deps.profile))

  return router
}
