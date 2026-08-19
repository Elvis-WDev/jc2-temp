import { del, get, patch, post } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/catalog-terms`.
 *
 * Son los vocabularios que antes estaban escritos a mano en el código del panel: los
 * tipos de enlace, de archivo, de material y de vínculo. Ahora se gestionan desde la
 * aplicación.
 *
 * Las columnas que guardan estos códigos siguen siendo texto libre, así que un valor
 * que llegue de otro sistema y no tenga término se sigue guardando y mostrando.
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

export const NOMBRE_DE_CATALOGO: Record<Catalog, string> = {
  work_link: 'Links on a work',
  person_link: 'Your profiles and networks',
  work_file: 'Files on a work',
  course_material: 'Course materials',
  affiliation: 'Tipos de vinculo',
  venue: 'Venue types',
  event: 'Event types',
  course_level: 'Course levels',
  post_kind: 'News and blog kinds',
}

export const QUE_ES_CATALOGO: Record<Catalog, string> = {
  work_link: 'Where each link on a work points: publisher, DOI, data...',
  person_link: 'The places where you have a profile: ORCID, Scholar, GitHub...',
  work_file: 'What each file attached to a work is.',
  course_material: 'What each material of a course offering is.',
  affiliation:
    'What your appointment with an institution is: permanent, visiting...',
  venue: 'What each venue is: journal, publisher, conference...',
  event: 'What each event is: seminar, conference, thesis defence...',
  course_level:
    'Your courses are grouped by these on the site. The description is the intro of each group.',
  post_kind:
    'What each entry is: a news item or a blog post. `news` and `personal` have their own page and are not removed.',
}

export interface CatalogTerm {
  id: string
  catalog: Catalog
  code: string
  label: string
  /** Entradilla del grupo en la web publica. Solo la usan los niveles de curso. */
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CatalogTermCreateInput {
  catalog: Catalog
  code: string
  label: string
  description?: string | null
  sortOrder?: number
}

export type CatalogTermUpdateInput = {
  label?: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

export function listCatalogTerms(
  catalog?: Catalog,
  activeOnly = false
): Promise<CatalogTerm[]> {
  return get<CatalogTerm[]>('/api/admin/catalog-terms', {
    ...(catalog === undefined ? {} : { catalog }),
    ...(activeOnly ? { active: 'true' } : {}),
  })
}

export function createCatalogTerm(
  input: CatalogTermCreateInput
): Promise<CatalogTerm> {
  return post<CatalogTerm>('/api/admin/catalog-terms', input)
}

/** Ni el catálogo ni el código se pueden cambiar: los usan las filas ya guardadas. */
export function updateCatalogTerm(
  id: string,
  input: CatalogTermUpdateInput
): Promise<CatalogTerm> {
  return patch<CatalogTerm>(`/api/admin/catalog-terms/${id}`, input)
}

/** Con filas que lo usan, la API responde 409: hay que ocultarlo en su lugar. */
export function deleteCatalogTerm(id: string): Promise<void> {
  return del(`/api/admin/catalog-terms/${id}`)
}
