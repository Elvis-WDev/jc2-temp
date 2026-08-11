import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Tags } from '@/features/tags'

/**
 * El estado del listado vive en la URL: un listado filtrado se puede compartir por
 * enlace y sobrevive a recargar (`data-tables.md:40-47`).
 */
const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  active: z.enum(['true', 'false']).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/admin/tags/')({
  validateSearch: searchSchema,
  component: Tags,
})
