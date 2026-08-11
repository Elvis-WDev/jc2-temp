import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../../../config/env.js'
import { PrismaClient } from './generated/client.js'

/**
 * Cliente Prisma de la aplicacion.
 *
 * Desde Prisma 7 la conexion se establece mediante un driver adapter en lugar de
 * la `url` del schema (ver prisma.config.ts y ADR sobre Prisma 7 en el plan).
 *
 * Es infraestructura: solo los repositorios lo importan. Ni el dominio ni los casos
 * de uso lo conocen, y el linter lo impide.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

export type Database = typeof prisma

/** Sonda de readiness: confirma que la base de datos responde. */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}
