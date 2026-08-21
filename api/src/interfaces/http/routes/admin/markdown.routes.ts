import { Router } from 'express'
import { renderMarkdown } from '../../../../shared/markdown/render.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { markdownPreviewSchema } from '../../schemas/markdown.schemas.js'
import { jsonHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'post',
  path: '/api/admin/markdown/preview',
  summary: 'Previsualiza Markdown',
  description:
    'Devuelve el mismo HTML que veria un visitante: pasa por el mismo conversor, la misma incrustacion de video y el mismo saneado que el contenido publicado. No guarda nada.',
  tags: ['Admin / Markdown'],
  responses: {
    200: { description: 'HTML saneado, o null si el texto esta vacio.' },
    401: respuestaError('Sin sesion.'),
    422: respuestaError('El texto pasa de 20.000 caracteres.'),
  },
})

/**
 * La vista previa del panel.
 *
 * Existe para que la respuesta sea **el mismo HTML** que sale publicado, no uno parecido.
 * Convertir el Markdown otra vez en el navegador habria sido mas rapido y sin viaje al
 * servidor, pero habria hecho falta repetir alli tres cosas —el conversor, la lista de
 * servidores de video y el saneador— y en cuanto una de las dos copias cambiara, la
 * vista previa empezaria a ensenar algo que la pagina no ensena. Una direccion de vídeo
 * suelta, por ejemplo, se veria como texto aqui y como reproductor alli.
 *
 * No necesita caso de uso: no toca la base ni tiene reglas de negocio. Es la funcion
 * compartida que ya usan los casos de uso al publicar, expuesta tal cual.
 */
export function createAdminMarkdownRouter(): Router {
  const router = Router()

  router.post(
    '/preview',
    validate({ body: markdownPreviewSchema }),
    jsonHandler((req) => {
      const { markdown } = validated<unknown, unknown, { markdown: string }>(req).body
      return Promise.resolve({ html: renderMarkdown(markdown) })
    }),
  )

  return router
}
