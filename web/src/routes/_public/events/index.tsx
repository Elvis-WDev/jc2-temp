import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SiteEvents } from '@/features/site/events'

const searchSchema = z.object({
  type: z.string().optional(),
  upcoming: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export const Route = createFileRoute('/_public/events/')({
  component: SiteEvents,
  validateSearch: searchSchema,
})
