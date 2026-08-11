import { env } from '../config/env.js'
import { logger } from '../shared/logging/logger.js'
import { createApp } from './app.js'
import { buildContainer } from './container.js'

const app = createApp(buildContainer())
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'API lista')
})

/**
 * Apagado ordenado: se deja de aceptar conexiones nuevas y se espera a que terminen
 * las que estan en curso. Sin esto, un redespliegue corta peticiones a medias.
 */
function shutdown(signal: string): void {
  logger.info({ signal }, 'Apagando')

  const forzar = setTimeout(() => {
    logger.error('Apagado ordenado agotado; forzando salida')
    process.exit(1)
  }, 10_000)
  forzar.unref()

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Fallo al cerrar el servidor')
      process.exit(1)
    }
    logger.info('Apagado completo')
    process.exit(0)
  })
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})
process.on('SIGINT', () => {
  shutdown('SIGINT')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promesa rechazada sin manejar')
})
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Excepcion no capturada; saliendo')
  process.exit(1)
})
