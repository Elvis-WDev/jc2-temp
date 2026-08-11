import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PersonLinks } from '@/features/person-links'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  isPublic: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/person-links/')({
  validateSearch: searchSchema,
  component: PersonLinks,
})
