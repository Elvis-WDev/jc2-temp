import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AcademicStatuses } from '@/features/academic-statuses'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  isActive: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/academic-statuses/')({
  validateSearch: searchSchema,
  component: AcademicStatuses,
})
