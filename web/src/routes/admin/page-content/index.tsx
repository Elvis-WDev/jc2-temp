import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PageContentList } from '@/features/page-content'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
})

export const Route = createFileRoute('/admin/page-content/')({
  validateSearch: searchSchema,
  component: PageContentList,
})
