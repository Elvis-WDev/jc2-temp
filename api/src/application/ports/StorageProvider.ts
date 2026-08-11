import type { Readable } from 'node:stream'
import type { Visibility } from '../../domain/media/UploadPolicy.js'

/**
 * Puerto de almacenamiento de binarios (ADR-0002).
 *
 * Los casos de uso solo conocen esta interfaz. Cambiar disco local por S3 o R2 es
 * escribir otro adaptador y una linea en el contenedor de dependencias.
 *
 * El puerto recibe un stream, no una ruta: una ruta de fichero solo tiene sentido
 * para el adaptador local y ataria la capa de aplicacion al sistema de archivos.
 */

export interface SavedFile {
  storageKey: string
  sizeBytes: number
  checksumSha256: string
}

export interface SaveFileInput {
  content: Readable
  visibility: Visibility
  /** Extension canonica del tipo DETECTADO, nunca la del nombre subido. */
  extension: string
  /** Identificador generado por el servidor; sera el nombre del archivo. */
  id: string
}

export interface StorageProvider {
  save(input: SaveFileInput): Promise<SavedFile>
  openRead(storageKey: string): Promise<Readable>
  /** Idempotente: borrar algo que ya no existe no es un error. */
  delete(storageKey: string): Promise<void>
  exists(storageKey: string): Promise<boolean>
}
