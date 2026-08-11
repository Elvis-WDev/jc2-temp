import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AuditLog } from '@/features/audit-log'

const searchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(20),
  entityType: z.string().optional().catch(undefined),
  action: z.string().optional().catch(undefined),
  // Dias sueltos en formato AAAA-MM-DD; se convierten a instantes al consultar.
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/admin/audit-log/')({
  validateSearch: searchSchema,
  component: AuditLog,
})
