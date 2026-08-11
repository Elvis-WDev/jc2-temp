import { randomUUID } from 'node:crypto'
import type { IdGenerator } from '../../application/ports/IdGenerator.js'

/** UUID v4 del generador criptografico de Node. */
export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID()
  }
}
