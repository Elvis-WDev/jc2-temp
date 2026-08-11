import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { WorkTypes } from '@/features/work-types'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
})

export const Route = createFileRoute('/admin/work-types/')({
  validateSearch: searchSchema,
  component: WorkTypes,
})
