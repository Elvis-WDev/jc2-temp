import { ValidationError } from '../../shared/errors/AppError.js'

/**
 * Invariantes de las paginas del sitio.
 *
 * El estado editorial de un contenido y la visibilidad de una pagina son dos llaves
 * distintas: la primera decide si un trabajo concreto existe para el publico (RN-001),
 * y la segunda si la web ensena esa seccion. Ninguna sustituye a la otra.
 */

/** La unica pagina que no se puede ocultar. Un sitio sin raiz no es un sitio. */
export const PAGINA_SIEMPRE_VISIBLE = 'home'

/**
 * La portada no se puede ocultar.
 *
 * La regla vive aqui y no solo en el formulario: el panel desactiva el interruptor,
 * pero quien llame a la API por su cuenta tiene que encontrarse lo mismo.
 */
export function assertPageCanBeHidden(pageKey: string): void {
  if (pageKey === PAGINA_SIEMPRE_VISIBLE) {
    throw new ValidationError(
      'The home page cannot be hidden.',
      { isPublished: 'La portada siempre esta visible.' },
      'HOME_PAGE_ALWAYS_VISIBLE',
    )
  }
}

/**
 * Las secciones que el codigo conoce, por pagina y en el orden en que se pintan.
 *
 * Es la lista de verdad: la tabla solo guarda su visibilidad. Una fila con una clave
 * que no este aqui se ignora —quedo de una version anterior— y una seccion de aqui sin
 * fila se considera visible, para que anadir una no obligue a migrar.
 */
export const SECCIONES: Record<string, readonly string[]> = {
  // La portada habla de la persona, no de su produccion: el carrusel, los destacados,
  // la docencia y la agenda se retiraron, y sus filas viejas de `page_sections` dejan de
  // aparecer solas —lo que no esta aqui, no se dibuja ni se ofrece en el panel—.
  //
  // `image` y `research_areas` son dos bandas distintas y en este orden: primero la
  // ilustracion sola sobre el solido, y despues las lineas de investigacion con su texto.
  home: ['hero', 'image', 'research_areas', 'latest_news'],
  research: ['header'],
  teaching: ['header', 'filters'],
  events: ['header'],
  news: ['header'],
  blog: ['header'],
}

/** Si una seccion se ve, con el criterio de "sin fila, visible". */
export function esVisible(
  secciones: Array<{ pageKey: string; sectionKey: string; isVisible: boolean }>,
  pageKey: string,
  sectionKey: string,
): boolean {
  const fila = secciones.find(
    (seccion) => seccion.pageKey === pageKey && seccion.sectionKey === sectionKey,
  )
  return fila?.isVisible ?? true
}
