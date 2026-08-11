import { logger } from '../../../shared/logging/logger.js'
import { disconnectDatabase } from '../prisma/client.js'
import { seedAdminUser } from './admin-user.seed.js'
import { seedCatalogTerms } from './catalog-terms.seed.js'
import { seedContenidoInicial } from './contenido.seed.js'
import { seedPageContent } from './page-content.seed.js'
import { seedSiteSettings } from './site-settings.seed.js'
import { seedTags } from './tags.seed.js'
import { seedWorkTypes } from './work-types.seed.js'

/**
 * Orquestador de seeds. Idempotente de principio a fin: seguro en produccion y
 * re-ejecutable en cada despliegue.
 *
 * Uso: corepack pnpm db:seed
 */
async function main(): Promise<void> {
  const workTypes = await seedWorkTypes()
  logger.info({ count: workTypes }, 'Tipos de trabajo sembrados')

  const terminos = await seedCatalogTerms()
  logger.info({ count: terminos }, 'Terminos de catalogo sembrados')

  const tags = await seedTags()
  logger.info({ count: tags }, 'Tags sembrados')

  const pages = await seedPageContent()
  logger.info({ count: pages }, 'Contenido de paginas sembrado')

  const settings = await seedSiteSettings()
  logger.info({ created: settings.created }, 'Configuracion del sitio')

  const admin = await seedAdminUser()
  // Nunca se registra la contrasena, solo el resultado.
  logger.info({ result: admin }, 'Administrador')

  // El ultimo, y solo si la base esta vacia: los anteriores describen la estructura de
  // la plataforma y se pueden repetir; este trae contenido y no debe pisar el del
  // titular en un redespliegue.
  const contenido = await seedContenidoInicial()
  logger.info({ result: contenido }, 'Contenido inicial')
}

main()
  .then(async () => {
    await disconnectDatabase()
    logger.info('Seed completado')
  })
  .catch(async (error: unknown) => {
    logger.fatal({ err: error }, 'Seed fallido')
    await disconnectDatabase()
    process.exitCode = 1
  })
