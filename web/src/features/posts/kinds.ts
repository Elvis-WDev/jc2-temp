/**
 * Las dos formas de una entrada.
 *
 * En la base son una sola tabla con un campo `kind`; en el panel son dos entradas de
 * menu, dos pantallas y dos formularios distintos. Este archivo es la unica costura
 * entre las dos cosas: el segmento de la direccion, el codigo del catalogo y lo que
 * cambia de una a otra.
 *
 * Solo estas dos tienen pantalla. Si el titular anade un tercer termino a `post_kind`
 * se guardara igual —la columna es texto libre— pero no tendra ni menu ni pagina, que
 * es lo mismo que decidio el sitemap en la API.
 */

export type PostSegment = 'news' | 'blog'

export interface PostKind {
  /** Lo que va en la direccion: `/admin/posts/news`. */
  segment: PostSegment
  /** El codigo guardado en la columna `kind`, del catalogo `post_kind`. */
  code: string
  singular: string
  plural: string
  descripcion: string
  /**
   * Si la forma admite cuerpo y adjuntos.
   *
   * Una noticia es un titulo, una foto y dos parrafos; pedirle un cuerpo largo y una
   * lista de archivos es pedirle lo que no necesita.
   */
  conCuerpo: boolean
}

const POST_KINDS: Record<PostSegment, PostKind> = {
  news: {
    segment: 'news',
    code: 'news',
    singular: 'news item',
    plural: 'News',
    descripcion: 'Short announcements: a grant, an award, an appointment.',
    conCuerpo: false,
  },
  blog: {
    segment: 'blog',
    code: 'personal',
    singular: 'post',
    plural: 'Blog',
    descripcion: 'Longer writing, outside your academic output.',
    conCuerpo: true,
  },
}

/** El tipo de un segmento de la direccion; `null` si no es ninguno de los dos. */
export function kindDeSegmento(segmento: string): PostKind | null {
  return POST_KINDS[segmento as PostSegment] ?? null
}
