import type { Readable } from 'node:stream'
import { fileTypeFromBuffer } from 'file-type'
import type {
  FileTypeDetector,
  InspectedContent,
} from '../../application/ports/FileTypeDetector.js'

/**
 * Bytes de cabecera que se leen para inspeccionar el archivo.
 *
 * `file-type` necesita unos 4 KB, pero la comprobacion de texto plano gana fiabilidad
 * con una muestra mayor: un binario puede tener sus primeros kilobytes limpios de
 * bytes nulos por casualidad.
 */
const BYTES_DE_MUESTRA = 64 * 1024

/** Un byte nulo no aparece en texto y si en practicamente cualquier binario. */
const BYTE_NULO = 0

/**
 * Un caracter multibyte puede quedar cortado en el limite de la muestra. Se descartan
 * hasta tres bytes finales antes de dar por invalido el UTF-8, que es la longitud
 * maxima de una secuencia truncada.
 */
const BYTES_DE_COLA_A_DESCARTAR = 3

function pareceTexto(muestra: Buffer): boolean {
  if (muestra.includes(BYTE_NULO)) return false

  const decodificador = new TextDecoder('utf-8', { fatal: true })

  for (let recorte = 0; recorte <= BYTES_DE_COLA_A_DESCARTAR; recorte += 1) {
    try {
      decodificador.decode(muestra.subarray(0, muestra.length - recorte))
      return true
    } catch {
      // Puede ser un multibyte truncado: se reintenta con un byte menos.
    }
  }

  return false
}

/**
 * Detecta el tipo real leyendo solo la cabecera del archivo (SEC-005).
 *
 * Es lo que hace que un ejecutable renombrado a .pdf no pase el filtro, y que un
 * binario disfrazado de .csv tampoco.
 */
export class MagicBytesFileTypeDetector implements FileTypeDetector {
  async inspect(content: Readable): Promise<InspectedContent> {
    const trozos: Buffer[] = []
    let leidos = 0

    for await (const trozo of content) {
      const buffer = trozo as Buffer
      trozos.push(buffer)
      leidos += buffer.length
      if (leidos >= BYTES_DE_MUESTRA) break
    }

    // El resto del archivo no aporta nada para identificarlo.
    content.destroy()

    if (trozos.length === 0) return { mime: null, looksLikeText: false }

    const muestra = Buffer.concat(trozos).subarray(0, BYTES_DE_MUESTRA)
    const detectado = await fileTypeFromBuffer(muestra)

    return {
      mime: detectado?.mime ?? null,
      // Solo interesa si NO hay firma binaria: un .docx es texto comprimido, pero se
      // identifica por su firma y no debe caer por el camino de texto.
      looksLikeText: detectado === undefined && pareceTexto(muestra),
    }
  }
}
