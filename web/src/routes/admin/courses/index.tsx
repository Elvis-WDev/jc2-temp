import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Courses } from '@/features/courses'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  status: z
    .enum(['draft', 'published', 'archived'])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/admin/courses/')({
  validateSearch: searchSchema,
  component: Courses,
})
