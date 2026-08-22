/**
 * Lo que cabe en un campo de texto largo, segun para que sea.
 *
 * Tres tamanos y no doce numeros sueltos. Antes cada esquema escribia el suyo a mano y
 * la vista previa se puso en 20.000 «igual que el campo mas largo», que era falso por un
 * factor de cinco: un cuerpo de blog de 20.800 caracteres se guardaba sin problema y la
 * previa respondia que no se podia cargar.
 */
export const LARGO_DE_TEXTO = {
  /** Una nota al pie de una ficha: el departamento, la afiliacion. */
  BREVE: 20_000,
  /** Lo normal: un resumen, una biografia, la descripcion de un curso. */
  NORMAL: 50_000,
  /** El cuerpo de una entrada, que es lo unico que se escribe como un articulo. */
  CUERPO: 100_000,
} as const

/**
 * Lo que tiene que aceptar la vista previa: el mayor de todos.
 *
 * Se calcula, no se escribe. Subir un tamano de arriba lo sube aqui solo, que es lo que
 * evita que vuelvan a desfasarse.
 */
export const LARGO_MAXIMO_PREVISUALIZABLE = Math.max(...Object.values(LARGO_DE_TEXTO))
