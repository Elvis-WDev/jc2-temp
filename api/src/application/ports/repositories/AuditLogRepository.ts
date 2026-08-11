import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Lectura de la auditoria (ERS §27, §31). */

export interface AuditLogEntry {
  id: string
  userId: string | null
  userName: string | null
  action: string
  entityType: string
  entityId: string | null
  oldData: unknown
  newData: unknown
  ipAddress: string | null
  createdAt: Date
}

export interface AuditLogFilters {
  entityType: string | null
  entityId: string | null
  userId: string | null
  /** create, update, delete, publish, archive, login. */
  action: string | null
  from: Date | null
  to: Date | null
}

/**
 * Solo lectura, a proposito: una auditoria que se puede editar o borrar desde la
 * propia API no sirve para auditar nada.
 */
export interface AuditLogRepository {
  list(
    query: PaginationQuery,
    filters: AuditLogFilters,
  ): Promise<{ items: AuditLogEntry[]; totalItems: number }>
}
