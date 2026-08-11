import path from 'node:path'
import type { Visibility } from '../../../domain/media/UploadPolicy.js'

/**
 * Construccion y validacion de rutas del almacenamiento local.
 *
 * La defensa principal contra path traversal NO esta aqui: esta en que ninguna ruta
 * HTTP acepta un nombre de archivo. El cliente envia un UUID, el backend busca la
 * `storage_key` en la base de datos y solo entonces resuelve. El atacante no controla
 * ningun segmento de la ruta.
 *
 * Esto es la segunda barrera, por si una clave llegase corrompida desde la base de
 * datos, un script de migracion o un futuro importador.
 */

export class UnsafeStorageKeyError extends Error {
  constructor(motivo: string) {
    super(`Clave de almacenamiento no segura: ${motivo}`)
    this.name = 'UnsafeStorageKeyError'
  }
}

/**
 * Genera la clave: `{visibilidad}/{aaaa}/{mm}/{uuid}.{ext}`.
 *
 * El UUID lo genera el servidor y la extension sale del tipo DETECTADO. El nombre
 * original del cliente no participa: se guarda aparte como metadato para mostrarlo.
 * Particionar por ano y mes evita directorios con decenas de miles de entradas.
 */
export function buildStorageKey(params: {
  visibility: Visibility
  extension: string
  id: string
  now: Date
}): string {
  const anio = params.now.getUTCFullYear().toString()
  const mes = (params.now.getUTCMonth() + 1).toString().padStart(2, '0')
  return `${params.visibility}/${anio}/${mes}/${params.id}.${params.extension}`
}

/** Comprueba que la clave no intenta escapar del arbol de almacenamiento. */
export function assertSafeStorageKey(storageKey: string): void {
  if (storageKey.length === 0) {
    throw new UnsafeStorageKeyError('vacia')
  }
  if ([...storageKey].some((caracter) => (caracter.codePointAt(0) ?? 0) === 0)) {
    throw new UnsafeStorageKeyError('contiene un byte nulo')
  }
  if (path.isAbsolute(storageKey) || storageKey.startsWith('/') || storageKey.startsWith('\\')) {
    throw new UnsafeStorageKeyError('es una ruta absoluta')
  }
  // Se comprueban los segmentos, no la cadena completa: descartar solo la subcadena
  // ".." rechazaria un nombre legitimo como "informe..final.pdf".
  const segmentos = storageKey.split(/[/\\]/)
  if (segmentos.some((segmento) => segmento === '..')) {
    throw new UnsafeStorageKeyError('contiene un segmento ..')
  }
}

/**
 * Resuelve la ruta absoluta y confirma que cae dentro de la raiz.
 *
 * La comparacion incluye el separador final para que `/srv/storage-publico` no pase
 * el control por estar dentro de `/srv/storage`.
 */
export function resolveStoragePath(root: string, storageKey: string): string {
  assertSafeStorageKey(storageKey)

  const raizAbsoluta = path.resolve(root)
  const destino = path.resolve(raizAbsoluta, storageKey)

  if (destino !== raizAbsoluta && !destino.startsWith(raizAbsoluta + path.sep)) {
    throw new UnsafeStorageKeyError('resuelve fuera de la raiz de almacenamiento')
  }

  return destino
}
