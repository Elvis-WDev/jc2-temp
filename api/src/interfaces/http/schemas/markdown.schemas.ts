import { z } from 'zod'
import { LARGO_MAXIMO_PREVISUALIZABLE } from '../../../shared/markdown/limites.js'
import { registry } from '../openapi/registry.js'

/**
 * Lo que se manda a previsualizar.
 *
 * El limite es el del campo mas largo que se puede guardar, y **se calcula** a partir de
 * los tamanos de `limites.ts` en lugar de escribirse aqui. Escrito a mano estuvo en
 * 20.000 con un comentario que aseguraba que era ese mismo maximo: no lo era, el cuerpo
 * de una entrada admite 100.000. Un texto de 20.800 se guardaba sin protestar y la vista
 * previa respondia que no se podia cargar.
 */
export const markdownPreviewSchema = registry.register(
  'MarkdownPreview',
  z.object({
    markdown: z.string().max(LARGO_MAXIMO_PREVISUALIZABLE),
  }),
)
