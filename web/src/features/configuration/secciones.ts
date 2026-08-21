/**
 * Las secciones del modulo de Configuracion, en el orden en que se ensenan.
 *
 * Viven aparte del marco porque las necesita tambien el menu lateral, para saber cuando
 * esta dentro del modulo y marcar su entrada.
 */
export const SECCIONES = [
  { titulo: 'Work types', url: '/admin/work-types' },
  { titulo: 'Academic statuses', url: '/admin/academic-statuses' },
  { titulo: 'Venues', url: '/admin/venues' },
  { titulo: 'Citation styles', url: '/admin/citation-styles' },
  { titulo: 'Tags', url: '/admin/tags' },
  { titulo: 'Institutions', url: '/admin/institutions' },
  { titulo: 'Departments', url: '/admin/departments' },
  { titulo: 'Catalogues', url: '/admin/catalogs' },
] as const

/** Las direcciones del modulo, para que el menu sepa cuando esta dentro. */
export const RUTAS_DE_CONFIGURACION: readonly string[] = SECCIONES.map(
  (seccion) => seccion.url
)
