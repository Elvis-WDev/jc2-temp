import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CitationStyles } from '@/features/citation-styles'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
  isActive: z.enum(['true', 'false']).optional().catch(undefined),
})

export const Route = createFileRoute('/admin/citation-styles/')({
  validateSearch: searchSchema,
  component: CitationStyles,
})
