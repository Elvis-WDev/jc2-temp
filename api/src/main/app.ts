import express, { type Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { toNodeHandler } from 'better-auth/node'
import swaggerUi from 'swagger-ui-express'
import { env, isProduction } from '../config/env.js'
import { errorHandler } from '../interfaces/http/middlewares/errorHandler.js'
import { httpLogger } from '../interfaces/http/middlewares/httpLogger.js'
import { notFound } from '../interfaces/http/middlewares/notFound.js'
import {
  globalRateLimit,
  loginRateLimit,
  publicRateLimit,
} from '../interfaces/http/middlewares/rateLimit.js'
import { buildOpenApiDocument } from '../interfaces/http/openapi/document.js'
import { createAdminRouter } from '../interfaces/http/routes/admin/index.js'
import { createHealthRouter } from '../interfaces/http/routes/health.routes.js'
import { createPublicRouter } from '../interfaces/http/routes/public/index.js'
import type { Container } from './container.js'

/**
 * Composition root del servidor HTTP. El orden de los middlewares es significativo
 * y esta comentado alli donde no es evidente.
 */
export function createApp(container: Container): Express {
  const app = express()

  // Detras de un proxy inverso, Express necesita confiar en X-Forwarded-For para que
  // el rate limiting no acabe contando todas las peticiones contra la IP del proxy.
  // Se limita a un salto: confiar en toda la cadena permitiria falsificar la IP y
  // saltarse el limite. Sin proxy en desarrollo, no se confia en nadie.
  app.set('trust proxy', isProduction ? 1 : false)
  app.disable('x-powered-by')

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))

  // Antes del rate limit, para que tambien queden registradas las peticiones limitadas.
  app.use(httpLogger)
  app.use(globalRateLimit)

  // Limite estricto sobre el inicio de sesion (SEC-003), mas duro que el global.
  // Va antes del handler de Better Auth para cortar la peticion cuanto antes.
  app.use('/api/admin/auth/sign-in', loginRateLimit)

  // Better Auth necesita el cuerpo crudo, asi que se monta ANTES de express.json()
  // (backend.md:67). Queda fuera del router administrativo a proposito: iniciar
  // sesion no puede exigir una sesion previa.
  app.all('/api/admin/auth/*splat', toNodeHandler(container.auth))

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  app.use(createHealthRouter({ checkDatabase: container.checkDatabase }))
  app.use(
    '/api/public',
    // El limite de lo publico es otro: ver rateLimit.ts.
    publicRateLimit,
    createPublicRouter({
      media: container.media,
      profile: container.publicProfile,
      research: container.publicResearch,
      teaching: container.publicTeaching,
      home: container.home,
      site: container.site,
      sitemap: container.sitemap,
      events: container.publicEvents,
    }),
  )
  app.use(
    '/api/admin',
    createAdminRouter({
      sessionReader: container.sessionReader,
      media: container.media,
      profile: container.profile,
      research: container.research,
      teaching: container.teaching,
      dashboard: container.dashboard,
      tags: container.tags,
      venues: container.venues,
      events: container.events,
      citations: container.citations,
      catalog: container.catalog,
    }),
  )

  // El documento se genera una vez montadas las rutas, con el registro ya completo.
  const openApiDocument = buildOpenApiDocument()
  app.get('/openapi.json', (_req, res) => {
    res.json(openApiDocument)
  })
  // Swagger UI necesita estilos y scripts en linea, que la CSP por defecto de helmet
  // bloquea. La excepcion se acota a esta ruta.
  app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
  )

  app.use(notFound)
  app.use(errorHandler)

  return app
}
