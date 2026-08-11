import { MEDIA_KINDS } from '../../../domain/media/MediaKind.js'
import { MEDIA_PURPOSES, VISIBILITIES } from '../../../domain/media/UploadPolicy.js'
import { paginationQuerySchema } from '../../../shared/http/pagination.js'
import { registry, z } from '../openapi/registry.js'

export const mediaIdParamsSchema = z.object({
  id: z.uuid(),
})

/**
 * Filtros de la biblioteca. Los tres son opcionales y omitirlos significa "no filtrar";
 * asi la URL sin parametros sigue devolviendo todo, como hasta ahora.
 */
export const mediaListQuerySchema = paginationQuerySchema.extend({
  kind: z.enum(MEDIA_KINDS).optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  q: z.string().trim().max(200).optional(),
})

export const uploadBodySchema = z.object({
  // Los valores validos salen de la politica de dominio: una sola fuente de verdad.
  purpose: z.enum(MEDIA_PURPOSES),
  // Por defecto privado: un archivo se hace publico por decision explicita, nunca
  // por descuido al omitir el campo.
  visibility: z.enum(VISIBILITIES).default('private'),
})

export const updateMediaBodySchema = z
  .object({
    altText: z.string().max(1000).nullable(),
    caption: z.string().max(2000).nullable(),
    credit: z.string().max(500).nullable(),
    isPublic: z.boolean(),
  })
  .partial()

export const mediaAssetSchema = registry.register(
  'MediaAsset',
  z.object({
    id: z.uuid(),
    originalFilename: z.string(),
    mimeType: z.string(),
    sizeBytes: z.number().int(),
    checksumSha256: z.string().nullable(),
    altText: z.string().nullable(),
    caption: z.string().nullable(),
    credit: z.string().nullable(),
    isPublic: z.boolean(),
    createdAt: z.iso.datetime(),
  }),
)

export type UploadBody = z.infer<typeof uploadBodySchema>
export type UpdateMediaBody = z.infer<typeof updateMediaBodySchema>
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>
