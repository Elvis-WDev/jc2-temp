import { Router } from 'express'
import { success } from '../../../shared/http/envelope.js'
import { registry, z } from '../openapi/registry.js'

/**
 * Sondas de salud (bootstrap.md:35, deployment.md:59).
 *
 * `/health` es liveness y NO toca la base de datos a proposito: si respondiera 503
 * por un fallo de PostgreSQL, el orquestador reiniciaria el contenedor en bucle sin
 * arreglar nada. `/health/ready` es readiness y ahi si se comprueba la conexion.
 */
const healthResponseSchema = registry.register(
  'HealthResponse',
  z.object({
    data: z.object({
      status: z.literal('ok'),
      uptimeSeconds: z.number(),
    }),
  }),
)

const readinessResponseSchema = registry.register(
  'ReadinessResponse',
  z.object({
    data: z.object({
      status: z.enum(['ready', 'not-ready']),
      database: z.boolean(),
    }),
  }),
)

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness probe',
  tags: ['System'],
  responses: {
    200: {
      description: 'El proceso esta vivo.',
      content: { 'application/json': { schema: healthResponseSchema } },
    },
  },
})

registry.registerPath({
  method: 'get',
  path: '/health/ready',
  summary: 'Readiness probe',
  tags: ['System'],
  responses: {
    200: {
      description: 'La aplicacion puede atender trafico.',
      content: { 'application/json': { schema: readinessResponseSchema } },
    },
    503: {
      description: 'Alguna dependencia no esta disponible.',
      content: { 'application/json': { schema: readinessResponseSchema } },
    },
  },
})

export interface HealthRouterDeps {
  checkDatabase: () => Promise<boolean>
}

export function createHealthRouter(deps: HealthRouterDeps): Router {
  const router = Router()

  router.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' as const, uptimeSeconds: Math.round(process.uptime()) }))
  })

  router.get('/health/ready', (_req, res, next) => {
    deps
      .checkDatabase()
      .then((database) => {
        res
          .status(database ? 200 : 503)
          .json(
            success({ status: database ? ('ready' as const) : ('not-ready' as const), database }),
          )
      })
      .catch(next)
  })

  return router
}
