import { Router } from 'express'
import type { MediaControllerDeps } from '../../controllers/media.controller.js'
import { createMediaController } from '../../controllers/media.controller.js'
import { validate } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { mediaIdParamsSchema } from '../../schemas/media.schemas.js'
import { respuestaError } from '../../schemas/common.schemas.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/media/{id}',
  summary: 'Descarga un archivo publico',
  description:
    'Requiere que el archivo este marcado publico Y que lo referencie contenido publicado. Un archivo no alcanzable responde 404, no 403: un 403 confirmaria que el identificador existe.',
  tags: ['Public / Media'],
  responses: {
    200: { description: 'Contenido del archivo.' },
    404: respuestaError('No existe o no es publicamente alcanzable.'),
  },
})

/**
 * Unica via publica a un archivo.
 *
 * No hay `express.static` sobre STORAGE_ROOT: servir el directorio expondria los
 * privados y dejaria la autorizacion en manos de la disposicion de carpetas.
 */
export function createPublicMediaRouter(deps: MediaControllerDeps): Router {
  const router = Router()
  const controller = createMediaController(deps)

  router.get('/:id', validate({ params: mediaIdParamsSchema }), controller.downloadAsPublic)

  return router
}
