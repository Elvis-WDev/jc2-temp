import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogRepository,
} from '../../../../application/ports/repositories/AuditLogRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'

export class PrismaAuditLogRepository implements AuditLogRepository {
  async list(
    query: PaginationQuery,
    filters: AuditLogFilters,
  ): Promise<{ items: AuditLogEntry[]; totalItems: number }> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.entityType === null ? {} : { entityType: filters.entityType }),
      ...(filters.entityId === null ? {} : { entityId: filters.entityId }),
      ...(filters.userId === null ? {} : { userId: filters.userId }),
      ...(filters.action === null ? {} : { action: filters.action }),
      ...(filters.from === null && filters.to === null
        ? {}
        : {
            createdAt: {
              ...(filters.from === null ? {} : { gte: filters.from }),
              ...(filters.to === null ? {} : { lte: filters.to }),
            },
          }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      items: filas.map((fila) => ({
        id: fila.id,
        userId: fila.userId,
        // El nombre viene de la relacion; si el usuario se borro queda null y la
        // entrada se conserva, que es justo lo que debe pasar en una auditoria.
        userName: fila.user?.name ?? null,
        action: fila.action,
        entityType: fila.entityType,
        entityId: fila.entityId,
        oldData: fila.oldData,
        newData: fila.newData,
        ipAddress: fila.ipAddress,
        createdAt: fila.createdAt,
      })),
      totalItems,
    }
  }
}
