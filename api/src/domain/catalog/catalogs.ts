/**
 * Los vocabularios que el titular gestiona desde el panel.
 *
 * Vive aqui, y no junto al sembrador ni junto a la ruta, porque los dos necesitan la
 * misma lista: el sembrador para poblarla y el borde HTTP para no aceptar un nombre que
 * no existe. Cuando eran dos listas escritas a mano, anadir `post_kind` al sembrador
 * dejo la pantalla de Catalogos respondiendo 422 al elegirlo.
 *
 * Se valida aqui y no con un enum en la base: anadir un vocabulario no debe obligar a
 * migrar, y las columnas que guardan estos codigos siguen siendo texto libre.
 */
export const CATALOGS = [
  'work_link',
  'person_link',
  'work_file',
  'course_material',
  'affiliation',
  'venue',
  'event',
  'course_level',
  'post_kind',
] as const

export type Catalog = (typeof CATALOGS)[number]
