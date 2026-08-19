import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Posts } from '@/features/posts'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional()
    .catch(undefined),
})

// El tipo va en la direccion y no en la busqueda: desde News solo se ven noticias, y
// eso no es un filtro que se pueda quitar.
export const Route = createFileRoute('/admin/posts/$kind/')({
  validateSearch: searchSchema,
  component: Posts,
})
