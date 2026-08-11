/**
 * ¿Tiene forma de UUID?
 *
 * Hace falta para las busquedas "por identificador o por slug" de la web publica.
 * `id` es una columna `uuid` en PostgreSQL: compararla con un texto que no lo es hace
 * que la base de datos rechace la consulta entera, no que no encuentre nada. Sin esta
 * comprobacion, abrir cualquier pagina publica por su direccion legible terminaba en un
 * error 500, mientras que abrirla por su identificador funcionaba.
 *
 * Acepta cualquier version, incluida la 7 que usa el proyecto para las claves.
 */
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(valor: string): boolean {
  return FORMATO_UUID.test(valor)
}

/**
 * Condicion de busqueda para una referencia que puede ser un identificador o un slug.
 * Solo pregunta por el identificador cuando lo que llega puede serlo.
 */
export function matchIdOrSlug(idOrSlug: string): Array<{ id: string } | { slug: string }> {
  return isUuid(idOrSlug) ? [{ id: idOrSlug }, { slug: idOrSlug }] : [{ slug: idOrSlug }]
}
