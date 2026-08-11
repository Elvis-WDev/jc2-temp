import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Institutions } from '@/features/institutions'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  active: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/institutions/')({
  validateSearch: searchSchema,
  component: Institutions,
})
