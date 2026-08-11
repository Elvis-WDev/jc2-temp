import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Events } from '@/features/events'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  eventType: z.string().optional().catch(undefined),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/admin/events/')({
  validateSearch: searchSchema,
  component: Events,
})
