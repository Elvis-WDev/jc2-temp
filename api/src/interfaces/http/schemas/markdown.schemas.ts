import { z } from 'zod'
import { registry } from '../openapi/registry.js'

/**
 * Lo que se manda a previsualizar.
 *
 * El limite es el mismo que el del campo mas largo que se guarda —20.000— para que la
 * vista previa no acepte lo que luego el guardado rechazaria.
 */
export const markdownPreviewSchema = registry.register(
  'MarkdownPreview',
  z.object({
    markdown: z.string().max(20000),
  }),
)
