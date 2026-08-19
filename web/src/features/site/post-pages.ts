/**
 * Las dos paginas de entradas: noticias y blog.
 *
 * Comparten componente de listado y de ficha, porque comparten forma. Lo que las
 * distingue —el filtro, la direccion, los textos por defecto de la cabecera— vive aqui
 * y solo aqui, para que el resto no tenga que preguntarse en cual esta.
 *
 * `kind` es el codigo del catalogo `post_kind` y `pageKey` la clave de `page_content`:
 * en el blog no coinciden porque el catalogo lo llama `personal` desde su primera
 * version, y renombrarlo obligaria a migrar las filas que ya lo usan.
 */
export interface PaginaDeEntradas {
  pageKey: 'news' | 'blog'
  kind: string
  ruta: '/news' | '/blog'
  rutaDeFicha: '/news/$slug' | '/blog/$slug'
  titulo: string
  entradilla: string
  /** Lo que se lee cuando no hay nada publicado todavia. */
  vacio: string
  /** Si sus entradas llevan cuerpo largo y adjuntos. */
  conCuerpo: boolean
}

export const NOTICIAS: PaginaDeEntradas = {
  pageKey: 'news',
  kind: 'news',
  ruta: '/news',
  rutaDeFicha: '/news/$slug',
  titulo: 'News',
  entradilla: 'Announcements, awards and appointments.',
  vacio: 'No news published yet.',
  conCuerpo: false,
}

export const BLOG: PaginaDeEntradas = {
  pageKey: 'blog',
  kind: 'personal',
  ruta: '/blog',
  rutaDeFicha: '/blog/$slug',
  titulo: 'Blog',
  entradilla: 'Notes and longer writing, outside the academic record.',
  vacio: 'No entries published yet.',
  conCuerpo: true,
}
