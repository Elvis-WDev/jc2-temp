/**
 * Puerto de auditoria (ERS §27, §60.20).
 *
 * Los casos de uso registran QUE paso, sin saber donde se guarda.
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'publish' | 'archive' | 'login'

export interface AuditEntry {
  userId: string | null
  action: AuditAction
  entityType: string
  entityId: string | null
  oldData?: unknown
  newData?: unknown
  ipAddress?: string | null
}

export interface AuditLogger {
  record(entry: AuditEntry): Promise<void>
}
