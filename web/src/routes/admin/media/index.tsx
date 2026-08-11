import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Media } from '@/features/media'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  kind: z
    .enum(['image', 'document', 'data', 'text', 'archive'])
    .optional()
    .catch(undefined),
  visibility: z.enum(['public', 'private']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/media/')({
  validateSearch: searchSchema,
  component: Media,
})
