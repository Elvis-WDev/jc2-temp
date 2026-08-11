import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { access, mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { Transform, type Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type {
  SaveFileInput,
  SavedFile,
  StorageProvider,
} from '../../../application/ports/StorageProvider.js'
import { buildStorageKey, resolveStoragePath } from './paths.js'

/** Directorios 0750 y archivos 0640: solo el usuario del proceso escribe y lee. */
const MODO_DIRECTORIO = 0o750
const MODO_ARCHIVO = 0o640

/**
 * Almacenamiento en disco local (ADR-0002).
 *
 * Escribe primero en `tmp/` DENTRO de la raiz y despues renombra. El rename es
 * atomico dentro del mismo sistema de archivos, de modo que nunca existe un archivo
 * a medio escribir en su ubicacion definitiva: o esta entero o no esta.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  async save(input: SaveFileInput): Promise<SavedFile> {
    const storageKey = buildStorageKey({
      visibility: input.visibility,
      extension: input.extension,
      id: input.id,
      now: new Date(),
    })

    const destino = resolveStoragePath(this.root, storageKey)
    const temporal = path.join(this.root, 'tmp', `${input.id}.part`)

    await mkdir(path.dirname(temporal), { recursive: true, mode: MODO_DIRECTORIO })
    await mkdir(path.dirname(destino), { recursive: true, mode: MODO_DIRECTORIO })

    const hash = createHash('sha256')
    let sizeBytes = 0

    // Se calculan tamano y checksum durante la escritura: un segundo recorrido del
    // archivo solo para hashear seria trabajo duplicado.
    const medidor = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk)
        sizeBytes += chunk.length
        callback(null, chunk)
      },
    })

    try {
      await pipeline(input.content, medidor, createWriteStream(temporal, { mode: MODO_ARCHIVO }))
      await rename(temporal, destino)
    } catch (error) {
      // Si algo falla, el temporal no debe quedarse ocupando disco.
      await rm(temporal, { force: true }).catch(() => undefined)
      throw error
    }

    return { storageKey, sizeBytes, checksumSha256: hash.digest('hex') }
  }

  openRead(storageKey: string): Promise<Readable> {
    const destino = resolveStoragePath(this.root, storageKey)
    return Promise.resolve(createReadStream(destino))
  }

  async delete(storageKey: string): Promise<void> {
    const destino = resolveStoragePath(this.root, storageKey)
    // `force` hace la operacion idempotente: borrar lo que ya no esta no es un fallo.
    await rm(destino, { force: true })
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await access(resolveStoragePath(this.root, storageKey))
      return true
    } catch {
      return false
    }
  }
}
