import { Router } from 'express'
import type { SessionReader } from '../../../../application/ports/SessionReader.js'
import type { MediaControllerDeps } from '../../controllers/media.controller.js'
import { createRequireAdmin } from '../../middlewares/requireAdmin.js'
import { createAdminCatalogRouter, type AdminCatalogRouterDeps } from './catalog.routes.js'
import { createAdminDashboardRouter, type AdminDashboardRouterDeps } from './dashboard.routes.js'
import { createAdminMediaRouter } from './media.routes.js'
import { createProfileRouter, type ProfileRouterDeps } from './profile.routes.js'
import { createAdminResearchRouter, type AdminResearchRouterDeps } from './research.routes.js'
import { createAdminTagsRouter, type AdminTagsRouterDeps } from './tags.routes.js'
import { createAdminTeachingRouter, type AdminTeachingRouterDeps } from './teaching.routes.js'
import { createAdminCitationsRouter, type AdminCitationsRouterDeps } from './citations.routes.js'
import { createAdminEventsRouter, type AdminEventsRouterDeps } from './events.routes.js'
import { createAdminPostsRouter, type AdminPostsRouterDeps } from './posts.routes.js'
import { createAdminVenuesRouter, type AdminVenuesRouterDeps } from './venues.routes.js'

export interface AdminRouterDeps {
  sessionReader: SessionReader
  media: MediaControllerDeps
  profile: ProfileRouterDeps
  research: AdminResearchRouterDeps
  teaching: AdminTeachingRouterDeps
  dashboard: AdminDashboardRouterDeps
  tags: AdminTagsRouterDeps
  catalog: AdminCatalogRouterDeps
  venues: AdminVenuesRouterDeps
  events: AdminEventsRouterDeps
  posts: AdminPostsRouterDeps
  citations: AdminCitationsRouterDeps
}

/**
 * Router administrativo (`/api/admin`).
 *
 * `requireAdmin` se monta aqui dentro, sobre el router entero, y no en app.ts: la
 * proteccion viaja con el router, de modo que cualquier ruta que se anada mas abajo
 * nace protegida sin que nadie tenga que acordarse.
 *
 * Las rutas de Better Auth NO cuelgan de este router: se montan aparte en app.ts,
 * antes de express.json(), porque necesitan el cuerpo crudo (backend.md:67) y porque
 * iniciar sesion no puede exigir una sesion previa.
 */
export function createAdminRouter(deps: AdminRouterDeps): Router {
  const router = Router()

  router.use(createRequireAdmin(deps.sessionReader))

  router.use('/dashboard', createAdminDashboardRouter(deps.dashboard))
  router.use('/media', createAdminMediaRouter(deps.media))
  router.use('/tags', createAdminTagsRouter(deps.tags))
  router.use('/', createAdminCatalogRouter(deps.catalog))
  router.use('/works', createAdminResearchRouter(deps.research))
  router.use('/', createAdminVenuesRouter(deps.venues))
  router.use('/events', createAdminEventsRouter(deps.events))
  router.use('/posts', createAdminPostsRouter(deps.posts))
  router.use('/', createAdminCitationsRouter(deps.citations))
  router.use('/', createAdminTeachingRouter(deps.teaching))
  router.use('/', createProfileRouter(deps.profile))

  return router
}
