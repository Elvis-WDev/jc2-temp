import type { MediaPurpose } from './UploadPolicy.js'

/**
 * Formatos de texto plano (ERS §9: data_archive y material de replicacion).
 *
 * Un .csv, un .tex o un .bib NO tienen magic bytes: la deteccion por firma devuelve
 * null y no sirve para identificarlos. Este es el segundo camino de la politica de
 * subida, y funciona al reves que el binario:
 *
 *   - el binario ignora el nombre del archivo y deriva la extension del tipo detectado;
 *   - aqui la EXTENSION del nombre original es lo unico que identifica el formato.
 *
 * Es una desviacion deliberada del principio "la extension sale del tipo detectado",
 * porque con texto plano no hay tipo detectado del que sacarla. El riesgo se acota de
 * tres formas: la extension se valida contra esta lista blanca (asi `.html`, `.svg` y
 * `.js` no pasan), el contenido debe ser texto UTF-8 real, y todo lo de aqui se sirve
 * SIEMPRE como descarga, nunca inline.
 */

export interface TextFormat {
  extension: string
  mime: string
}

const DATOS: TextFormat[] = [
  { extension: 'csv', mime: 'text/csv' },
  { extension: 'tsv', mime: 'text/tab-separated-values' },
  { extension: 'json', mime: 'application/json' },
]

/** Codigo y material de replicacion que acompana a un paper. */
const FUENTES: TextFormat[] = [
  { extension: 'tex', mime: 'text/x-tex' },
  { extension: 'bib', mime: 'text/x-bibtex' },
  { extension: 'r', mime: 'text/x-r' },
  // Stata (.do), Matlab/Octave (.m) y Python son lo habitual en economia aplicada.
  { extension: 'do', mime: 'text/plain' },
  { extension: 'm', mime: 'text/plain' },
  { extension: 'py', mime: 'text/x-python' },
  { extension: 'txt', mime: 'text/plain' },
  { extension: 'md', mime: 'text/markdown' },
]

const TEXTO_POR_PROPOSITO: Record<MediaPurpose, TextFormat[]> = {
  document: [],
  slides: [],
  image: [],
  dataset: DATOS,
  archive: [],
  source: [...FUENTES, ...DATOS],
  // Un audio nunca es texto plano: no hay formato que aceptar por este camino.
  audio: [],
}

export function textFormatsForPurpose(purpose: MediaPurpose): readonly TextFormat[] {
  return TEXTO_POR_PROPOSITO[purpose]
}

export function purposeAcceptsText(purpose: MediaPurpose): boolean {
  return TEXTO_POR_PROPOSITO[purpose].length > 0
}

/**
 * Extrae la extension de un nombre de archivo.
 *
 * Solo el ultimo segmento y en minusculas. No se usa para construir ninguna ruta:
 * el valor devuelto se contrasta con la lista blanca antes de llegar a la clave de
 * almacenamiento.
 */
export function extractExtension(filename: string): string | null {
  const punto = filename.lastIndexOf('.')
  if (punto <= 0 || punto === filename.length - 1) return null

  const extension = filename.slice(punto + 1).toLowerCase()
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : null
}

/** Resuelve el formato de texto para un proposito, o null si no esta permitido. */
export function resolveTextFormat(purpose: MediaPurpose, filename: string): TextFormat | null {
  const extension = extractExtension(filename)
  if (extension === null) return null

  return TEXTO_POR_PROPOSITO[purpose].find((formato) => formato.extension === extension) ?? null
}
