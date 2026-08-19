/**
 * Que tipos de entrada tienen pagina propia, y cual.
 *
 * `post_kind` es un vocabulario editable: el titular puede anadir un tercer tipo y sus
 * entradas se guardaran igual, porque la columna es texto libre. Lo que no puede es
 * inventarse una pagina donde ensenarlas. Esta lista dice cuales tienen sitio en la web,
 * y es la misma que consultan el sitemap —para no anunciar direcciones que darian 404—
 * y el listado publico —para respetar el interruptor de esa pagina—.
 *
 * El codigo y la clave de pagina no coinciden en el blog a proposito: el catalogo lo
 * llama `personal` desde su primera version y renombrarlo obligaria a migrar las filas
 * que ya lo usan.
 */
export const PAGINA_POR_TIPO_DE_POST: Record<string, 'news' | 'blog'> = {
  news: 'news',
  personal: 'blog',
}
