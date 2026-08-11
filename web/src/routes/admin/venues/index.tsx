import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Venues } from '@/features/venues'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  venueType: z.string().optional().catch(undefined),
  active: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/venues/')({
  validateSearch: searchSchema,
  component: Venues,
})
