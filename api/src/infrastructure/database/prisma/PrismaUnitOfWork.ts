import type { UnitOfWork } from '../../../application/ports/UnitOfWork.js'
import { prisma } from './client.js'
import type { PrismaClient } from './generated/client.js'

/** Cliente dentro de una transaccion: sin $transaction anidada ni $connect. */
export type TransactionContext = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>

/** Implementacion del puerto UnitOfWork sobre `prisma.$transaction` (ERS §49). */
export class PrismaUnitOfWork implements UnitOfWork<TransactionContext> {
  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => work(tx))
  }
}
