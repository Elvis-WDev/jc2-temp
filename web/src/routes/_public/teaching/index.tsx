import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SiteTeaching } from '@/features/site/teaching'

/** Los nombres son los que acepta la API publica, para que las dos direcciones se lean igual. */
const searchSchema = z.object({
  q: z.string().optional(),
  institution: z.string().optional(),
  department: z.string().optional(),
  tag: z.string().optional(),
  active: z.boolean().optional(),
  sort: z.enum(['newest', 'title']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
})

export const Route = createFileRoute('/_public/teaching/')({
  component: SiteTeaching,
  validateSearch: searchSchema,
})
