import { textFormatsForPurpose } from './TextFormatPolicy.js'
import { MEDIA_PURPOSES, allowedTypesForPurpose } from './UploadPolicy.js'

/**
 * Familias de archivo para poder buscar en la biblioteca.
 *
 * Los archivos NO guardan para que se subieron: el proposito valida la subida y ahi
 * termina su vida. Asi que "de que tipo es este archivo" se responde por su MIME, que si
 * esta guardado y ademas es el detectado, no el que dijo el navegador.
 *
 * Agrupar por MIME tiene un limite conocido: Stata (.do), Matlab (.m) y las notas sueltas
 * comparten `text/plain`, asi que caen todos en `text`. Distinguirlos exigiria una
 * columna nueva y rellenar hacia atras lo ya subido, a cambio de una precision que nadie
 * pide cuando lo que quiere es "ensename solo las imagenes".
 */

export const MEDIA_KINDS = ['image', 'audio', 'document', 'data', 'text', 'archive'] as const
export type MediaKind = (typeof MEDIA_KINDS)[number]

const MIMES: Record<MediaKind, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/x-m4a', 'audio/ogg'],
  document: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ],
  data: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    'text/tab-separated-values',
    'application/json',
  ],
  text: ['text/plain', 'text/markdown', 'text/x-tex', 'text/x-bibtex', 'text/x-r', 'text/x-python'],
  archive: [
    'application/zip',
    'application/gzip',
    'application/x-tar',
    'application/x-7z-compressed',
  ],
}

/** Los MIME que hay que buscar para una familia. */
export function mimesForKind(kind: MediaKind): readonly string[] {
  return MIMES[kind]
}

/** La familia de un archivo ya guardado, o null si su MIME no esta clasificado. */
export function kindOfMime(mime: string): MediaKind | null {
  return MEDIA_KINDS.find((kind) => MIMES[kind].includes(mime)) ?? null
}

/**
 * Todos los MIME que la plataforma puede llegar a almacenar, sacados de las dos
 * politicas de subida. Solo lo usa la prueba que vigila que ninguno se quede sin
 * clasificar: si manana se acepta un formato nuevo y se olvida aqui, sus archivos serian
 * invisibles para todos los filtros.
 */
export function todosLosMimesAceptados(): string[] {
  const binarios = MEDIA_PURPOSES.flatMap((purpose) =>
    allowedTypesForPurpose(purpose).map((tipo) => tipo.mime),
  )
  const texto = MEDIA_PURPOSES.flatMap((purpose) =>
    textFormatsForPurpose(purpose).map((formato) => formato.mime),
  )
  return [...new Set([...binarios, ...texto])]
}
