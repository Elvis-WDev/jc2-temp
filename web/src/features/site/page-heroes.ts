/**
 * El tono de la cabecera de cada pagina, alternando en el orden del menu.
 *
 * Un visitante que recorre el menu ve el fondo cambiar en cada salto. Estaba escrito en
 * cada pagina por separado y ya habia dejado de alternar: Events, News y Blog llevaban
 * las tres el mismo gris. Aqui se lee de un vistazo, y anadir una pagina es ponerla en
 * la lista, en su sitio.
 *
 * Los dos tonos son `--color-site-background` y `--color-site-surface-container`. El
 * claro se escribe como `bg-site-surface`, que es el mismo color que el fondo de la
 * pagina —`background` y `surface` valen `#f7fafd` los dos— pero dicho a proposito: una
 * cabecera sin clase de fondo parece que se olvido, no que se eligio.
 */
const PAGINAS_EN_ORDEN = [
  'home',
  'research',
  'teaching',
  'events',
  'news',
  'blog',
] as const

export type PaginaConCabecera = (typeof PAGINAS_EN_ORDEN)[number]

/**
 * La clase de fondo de la cabecera.
 *
 * Solo se aplica cuando la banda no tiene foto detras: con imagen, el color quedaria
 * tapado de todos modos y la cabecera se invierte entera.
 */
export function fondoDeCabecera(pagina: PaginaConCabecera): string {
  return PAGINAS_EN_ORDEN.indexOf(pagina) % 2 === 0
    ? 'bg-site-surface'
    : 'bg-site-surface-container'
}
