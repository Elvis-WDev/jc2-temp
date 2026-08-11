import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Persons } from '@/features/persons'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  q: z.string().optional().catch(''),
})

export const Route = createFileRoute('/admin/persons/')({
  validateSearch: searchSchema,
  component: Persons,
})
