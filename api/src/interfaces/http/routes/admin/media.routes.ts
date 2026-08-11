import { Router } from 'express'
import type { MediaControllerDeps } from '../../controllers/media.controller.js'
import { createMediaController } from '../../controllers/media.controller.js'
import { uploadRateLimit } from '../../middlewares/rateLimit.js'
import { uploadSingleFile } from '../../middlewares/upload.js'
import { validate } from '../../middlewares/validate.js'
import { registry, z } from '../../openapi/registry.js'
import {
  mediaAssetSchema,
  mediaIdParamsSchema,
  mediaListQuerySchema,
  updateMediaBodySchema,
  uploadBodySchema,
} from '../../schemas/media.schemas.js'
import { respuestaError } from '../../schemas/common.schemas.js'

/**
 * `force=true` desreferencia y borra un archivo en uso. Se acepta solo como cadena
 * explicita: `z.coerce.boolean()` convertiria "false" en true, porque Boolean("false")
 * es true en JavaScript.
 */
const deleteQuerySchema = z.object({
  force: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),
})

function registrarOpenApi(): void {
  registry.registerPath({
    method: 'post',
    path: '/api/admin/media/upload',
    summary: 'Sube un archivo',
    description:
      'El tipo se determina por magic bytes; el Content-Type y la extension enviados se ignoran.',
    tags: ['Admin / Media'],
    responses: {
      201: {
        description: 'Archivo almacenado.',
        content: { 'application/json': { schema: mediaAssetSchema } },
      },
      401: respuestaError('Sin sesion.'),
      413: respuestaError('Archivo demasiado grande.'),
      422: respuestaError('Tipo de archivo no permitido.'),
    },
  })

  registry.registerPath({
    method: 'delete',
    path: '/api/admin/media/{id}',
    summary: 'Borra un archivo',
    tags: ['Admin / Media'],
    responses: {
      204: { description: 'Borrado.' },
      401: respuestaError('Sin sesion.'),
      404: respuestaError('No existe.'),
      409: respuestaError('El archivo esta en uso.'),
    },
  })

  registry.registerPath({
    method: 'get',
    path: '/api/admin/media/{id}/download',
    summary: 'Descarga un archivo (incluidos los privados)',
    tags: ['Admin / Media'],
    responses: {
      200: { description: 'Contenido del archivo.' },
      401: respuestaError('Sin sesion.'),
      404: respuestaError('No existe.'),
    },
  })
}

registrarOpenApi()

/** Rutas de gestion de archivos. Cuelgan del router admin, ya protegido. */
export function createAdminMediaRouter(deps: MediaControllerDeps): Router {
  const router = Router()
  const controller = createMediaController(deps)

  router.post(
    '/upload',
    uploadRateLimit,
    // multer primero: sin el, `req.body` de un multipart llega vacio y la validacion
    // no tendria nada que mirar.
    uploadSingleFile(),
    validate({ body: uploadBodySchema }),
    controller.upload,
  )

  router.get('/', validate({ query: mediaListQuerySchema }), controller.list)

  router.get('/:id/download', validate({ params: mediaIdParamsSchema }), controller.downloadAsAdmin)

  router.patch(
    '/:id',
    validate({ params: mediaIdParamsSchema, body: updateMediaBodySchema }),
    controller.update,
  )

  router.delete(
    '/:id',
    validate({ params: mediaIdParamsSchema, query: deleteQuerySchema }),
    controller.remove,
  )

  return router
}
