import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogRepository,
} from '../../ports/repositories/AuditLogRepository.js'

/** Consulta de la auditoria administrativa (ERS §27, §31). */
export class GetAuditLog {
  constructor(private readonly repo: AuditLogRepository) {}

  async execute(
    query: PaginationQuery,
    filters: AuditLogFilters,
  ): Promise<Paginated<AuditLogEntry>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }
}
