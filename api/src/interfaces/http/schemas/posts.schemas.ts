import { z } from '../openapi/registry.js'
import { patchSchemaOf } from './common.schemas.js'

/**
 * Noticias y entradas de blog.
 *
 * El esquema es el mismo para las dos formas: lo que las distingue —que una noticia no
 * lleva cuerpo ni adjuntos— lo decide el formulario del panel, no la API. Aqui todo lo
 * que no sea el tipo y el titulo es opcional.
 */

export const postIdParamsSchema = z.object({ id: z.uuid() })
export const postRefParamsSchema = z.object({ idOrSlug: z.string().trim().min(1).max(220) })

const postFileSchema = z.object({
  mediaId: z.uuid(),
  label: z.string().trim().max(150).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
})

export const postCreateSchema = z.object({
  /** Codigo del catalogo `post_kind`. `news` y `personal` son los que tienen ruta. */
  kind: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(300),
  // Vacio: se deriva del titulo. Un slug publicado no cambia despues (RN-010).
  slug: z.string().trim().max(220).optional(),
  summary: z.string().max(2000).nullable().optional(),
  contentMarkdown: z.string().max(100000).nullable().optional(),
  imageMediaId: z.uuid().nullable().optional(),
  imageAlt: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.number().int().min(0).nullable().optional(),
  files: z.array(postFileSchema).optional(),
})

export const postUpdateSchema = patchSchemaOf(postCreateSchema)

export const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  kind: z.string().trim().max(50).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

export const publicPostQuerySchema = z.object({
  kind: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})
