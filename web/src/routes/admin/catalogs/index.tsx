import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Catalogs } from '@/features/catalogs'
import { CATALOGS } from '@/features/catalogs/api'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  // La lista vive en un sitio: anadir un catalogo no debe obligar a tocar la ruta.
  catalog: z.enum(CATALOGS).optional().catch(undefined),
  isActive: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/catalogs/')({
  validateSearch: searchSchema,
  component: Catalogs,
})
