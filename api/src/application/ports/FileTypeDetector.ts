import type { Readable } from 'node:stream'

/**
 * Inspeccion del contenido de un archivo (SEC-005).
 *
 * Nunca se confia en la extension ni en el Content-Type que envia el cliente: ambos
 * los controla quien sube el archivo.
 *
 * Se devuelven las dos senales de una sola lectura de la cabecera, porque los
 * formatos de texto plano no tienen magic bytes y necesitan otra comprobacion.
 */
export interface InspectedContent {
  /** MIME detectado por firma binaria, o null si el contenido no tiene ninguna. */
  mime: string | null
  /** La cabecera decodifica como UTF-8 y no contiene bytes nulos. */
  looksLikeText: boolean
}

export interface FileTypeDetector {
  inspect(content: Readable): Promise<InspectedContent>
}
