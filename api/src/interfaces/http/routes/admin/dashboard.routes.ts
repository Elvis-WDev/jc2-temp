import { Router } from 'express'
import type { GetDashboardMetrics } from '../../../../application/use-cases/admin/GetDashboardMetrics.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { jsonHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'get',
  path: '/api/admin/dashboard',
  summary: 'Metricas del panel',
  tags: ['Admin / Dashboard'],
  responses: {
    200: { description: 'Recuentos y ultimos cambios.' },
    401: respuestaError('Sin sesion.'),
  },
})

export interface AdminDashboardRouterDeps {
  dashboard: GetDashboardMetrics
}

export function createAdminDashboardRouter(deps: AdminDashboardRouterDeps): Router {
  const router = Router()
  router.get(
    '/',
    jsonHandler(() => deps.dashboard.execute()),
  )
  return router
}
