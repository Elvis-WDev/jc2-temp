import { z } from '../openapi/registry.js'

export const tagIdParamsSchema = z.object({ id: z.uuid() })

export const tagListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(50).optional(),
  // Sin el parametro salen todas; `true` solo las visibles y `false` solo las ocultas.
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * No se acepta `slug`: lo deriva el servidor del nombre. Permitir enviarlo abriria la
 * puerta a crear dos tags con el mismo nombre y slugs distintos, que es exactamente lo
 * que RF-007 quiere evitar.
 */
export const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const tagUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const tagDeleteQuerySchema = z.object({
  force: z
    .enum(['true', 'false'])
    .default('false')
    .transform((valor) => valor === 'true'),
})
