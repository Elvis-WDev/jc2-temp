import type { AuditEntry, AuditLogger } from '../../application/ports/AuditLogger.js'
import { prisma } from '../database/prisma/client.js'
import type { Prisma } from '../database/prisma/generated/client.js'
import { logger } from '../../shared/logging/logger.js'

/**
 * Normaliza un valor arbitrario a JSON almacenable.
 *
 * El viaje por JSON descarta lo que PostgreSQL no puede guardar (funciones,
 * undefined, referencias ciclicas fallarian aqui y no al insertar) y produce una
 * instantanea desacoplada del objeto original.
 */
function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/**
 * Auditoria persistida en `audit_log` (ERS §27).
 *
 * Un fallo al auditar no tumba la operacion de negocio que ya se completo: se
 * registra en el log de la aplicacion y se sigue. Auditar es importante, pero no
 * al precio de deshacer un cambio que el usuario dio por bueno.
 */
export class PrismaAuditLogger implements AuditLogger {
  async record(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          oldData: toJsonValue(entry.oldData),
          newData: toJsonValue(entry.newData),
          ipAddress: entry.ipAddress ?? null,
        },
      })
    } catch (error) {
      logger.error(
        { err: error, action: entry.action, entityType: entry.entityType },
        'No se pudo registrar la entrada de auditoria',
      )
    }
  }
}
