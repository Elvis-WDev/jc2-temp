/**
 * Politica de subida de archivos (SEC-005, ERS §9).
 *
 * Lista blanca, no lista negra: lo que no esta aqui se rechaza. Enumerar lo prohibido
 * siempre deja huecos.
 *
 * Este archivo cubre el camino BINARIO, en el que el tipo se determina por magic
 * bytes. Los formatos de texto plano no tienen firma y van por
 * `TextFormatPolicy.ts`.
 *
 * Vive en el dominio porque "que archivos acepta esta plataforma" es una regla de
 * negocio, no un detalle de transporte.
 */

export const VISIBILITIES = ['public', 'private'] as const
export type Visibility = (typeof VISIBILITIES)[number]

/**
 * Los propositos se corresponden con los tipos de archivo de ERS §9: paper_pdf y
 * appendix son `document`, slides es `slides`, data_archive es `dataset`,
 * code_archive es `archive`, cover y figure son `image`.
 */
export const MEDIA_PURPOSES = [
  'document',
  'slides',
  'image',
  'dataset',
  'archive',
  'source',
  'audio',
] as const
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number]

export interface AllowedType {
  /** MIME real, detectado por magic bytes. Nunca el que envia el cliente. */
  mime: string
  /** Extension canonica. Se deriva del tipo detectado, no del nombre subido. */
  extension: string
  /**
   * Si puede mostrarse en el navegador o debe descargarse siempre.
   * SVG no aparece en ninguna lista: puede contener <script> y se ejecutaria en el
   * origen del sitio.
   */
  inlineSafe: boolean
}

const PDF: AllowedType = { mime: 'application/pdf', extension: 'pdf', inlineSafe: true }

const TEXTO_ENRIQUECIDO: AllowedType[] = [
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
    inlineSafe: false,
  },
  { mime: 'application/vnd.oasis.opendocument.text', extension: 'odt', inlineSafe: false },
]

const PRESENTACIONES: AllowedType[] = [
  {
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: 'pptx',
    inlineSafe: false,
  },
  { mime: 'application/vnd.oasis.opendocument.presentation', extension: 'odp', inlineSafe: false },
]

const HOJAS_DE_CALCULO: AllowedType[] = [
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    inlineSafe: false,
  },
  { mime: 'application/vnd.oasis.opendocument.spreadsheet', extension: 'ods', inlineSafe: false },
]

const IMAGENES: AllowedType[] = [
  { mime: 'image/jpeg', extension: 'jpg', inlineSafe: true },
  { mime: 'image/png', extension: 'png', inlineSafe: true },
  { mime: 'image/webp', extension: 'webp', inlineSafe: true },
  { mime: 'image/gif', extension: 'gif', inlineSafe: true },
]

/**
 * Audio, para lo que se pueda escuchar sin descargarlo antes: una nota, un corte de una
 * entrevista, una grabacion corta.
 *
 * `inlineSafe` porque un reproductor necesita que el navegador lo abra en lugar de
 * bajarlo. El limite lo pone que la entrega no admite peticiones por rango: el archivo
 * se descarga entero antes de sonar, asi que 30 MB es lo que se puede esperar de una
 * conexion normal sin que la pagina parezca rota. Una charla de una hora se enlaza desde
 * donde ya este alojada, igual que el video.
 *
 * `audio/x-m4a` y no `audio/mp4`: es lo que devuelve la deteccion por firma para un .m4a,
 * y lo que se guarda es el tipo detectado, no el que diga el navegador.
 */
const AUDIOS: AllowedType[] = [
  { mime: 'audio/mpeg', extension: 'mp3', inlineSafe: true },
  { mime: 'audio/x-m4a', extension: 'm4a', inlineSafe: true },
  { mime: 'audio/ogg', extension: 'ogg', inlineSafe: true },
]

const COMPRIMIDOS: AllowedType[] = [
  { mime: 'application/zip', extension: 'zip', inlineSafe: false },
  { mime: 'application/gzip', extension: 'gz', inlineSafe: false },
  { mime: 'application/x-tar', extension: 'tar', inlineSafe: false },
  { mime: 'application/x-7z-compressed', extension: '7z', inlineSafe: false },
]

/**
 * Los formatos Office HEREDADOS (.doc, .xls, .ppt) quedan deliberadamente fuera: son
 * contenedores OLE y `file-type` los reporta todos como `application/x-cfb`, sin poder
 * distinguir un documento de una hoja de calculo. Aceptar ese MIME seria aceptar
 * cualquier OLE, incluidos los que llevan macros.
 */
const POR_PROPOSITO: Record<MediaPurpose, { tipos: AllowedType[]; maxBytes: number }> = {
  document: { tipos: [PDF, ...TEXTO_ENRIQUECIDO], maxBytes: 25 * 1024 * 1024 },
  slides: { tipos: [PDF, ...PRESENTACIONES], maxBytes: 50 * 1024 * 1024 },
  image: { tipos: IMAGENES, maxBytes: 5 * 1024 * 1024 },
  dataset: { tipos: HOJAS_DE_CALCULO, maxBytes: 50 * 1024 * 1024 },
  archive: { tipos: COMPRIMIDOS, maxBytes: 100 * 1024 * 1024 },
  // `source` no acepta ningun binario: solo texto plano (ver TextFormatPolicy).
  source: { tipos: [], maxBytes: 5 * 1024 * 1024 },
  audio: { tipos: AUDIOS, maxBytes: 30 * 1024 * 1024 },
}

/** Cota superior de cualquier subida, sea cual sea el proposito. */
export const MAX_PURPOSE_BYTES = Math.max(
  ...Object.values(POR_PROPOSITO).map((entrada) => entrada.maxBytes),
)

export function maxBytesForPurpose(purpose: MediaPurpose): number {
  return POR_PROPOSITO[purpose].maxBytes
}

export function allowedTypesForPurpose(purpose: MediaPurpose): readonly AllowedType[] {
  return POR_PROPOSITO[purpose].tipos
}

/**
 * Resuelve el tipo detectado contra la lista blanca del proposito.
 * Devuelve null si no esta permitido, sin distinguir "desconocido" de "prohibido":
 * la respuesta al cliente es la misma.
 */
export function resolveAllowedType(
  purpose: MediaPurpose,
  detectedMime: string,
): AllowedType | null {
  return POR_PROPOSITO[purpose].tipos.find((tipo) => tipo.mime === detectedMime) ?? null
}

const TODOS_LOS_TIPOS = Object.values(POR_PROPOSITO).flatMap((entrada) => entrada.tipos)

/** Solo estos MIME pueden mostrarse en el navegador; el resto se fuerza a descarga. */
export function isInlineSafe(mime: string): boolean {
  return TODOS_LOS_TIPOS.some((tipo) => tipo.mime === mime && tipo.inlineSafe)
}
