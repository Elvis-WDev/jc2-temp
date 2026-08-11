import { getWithMeta, type PaginatedMeta } from '@/lib/api/client'

/** Cliente de `/api/admin/audit-log` (ERS §27). Solo lectura, por diseno. */

export interface AuditEntry {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  oldData: unknown
  newData: unknown
  ipAddress: string | null
  createdAt: string
}

export interface AuditListParams {
  page?: number
  page_size?: number
  entityType?: string
  entityId?: string
  userId?: string
  action?: string
  /** Instantes ISO, no dias: el rango del calendario se convierte antes de llegar aqui. */
  from?: string
  to?: string
}

export const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  publish: 'Published',
  archive: 'Archived',
  login: 'Signed in',
}

export const ENTITY_LABELS: Record<string, string> = {
  works: 'Work',
  courses: 'Course',
  course_offerings: 'Course offering',
  events: 'Event',
  media_assets: 'File',
  persons: 'Person',
  institutions: 'Institution',
  departments: 'Department',
  venues: 'Venue',
  tags: 'Tag',
}

export async function listAuditLog(
  params: AuditListParams
): Promise<{ items: AuditEntry[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<AuditEntry[]>(
    '/api/admin/audit-log',
    params
  )
  return { items: data, meta }
}
