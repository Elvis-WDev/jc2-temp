import { del, get, patch, post } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/affiliations`.
 *
 * Las afiliaciones cuelgan siempre de una persona. En el panel esa persona es el
 * titular del sitio, que se obtiene de `/profile`.
 */

export interface Affiliation {
  id: string
  personId: string
  institutionId: string
  /** Resuelto por la API: la tabla muestra el nombre, no el identificador. */
  institutionName: string
  departmentId: string | null
  departmentName: string | null
  title: string
  affiliationType: string | null
  /** `AAAA-MM-DD`, el mismo formato que espera al guardar. */
  startDate: string | null
  endDate: string | null
  isPrimary: boolean
  isCurrent: boolean
  descriptionMarkdown: string | null
  sortOrder: number
}

export interface AffiliationInput {
  personId: string
  institutionId: string
  departmentId?: string | null
  title: string
  affiliationType?: string | null
  startDate?: string | null
  endDate?: string | null
  isPrimary?: boolean
  isCurrent?: boolean
  descriptionMarkdown?: string | null
  sortOrder?: number
}

export function listAffiliations(personId: string): Promise<Affiliation[]> {
  return get<Affiliation[]>('/api/admin/affiliations', { personId })
}

/**
 * El departamento debe pertenecer a la institución elegida (RN-006). Si no, la API
 * responde 422 `DEPARTMENT_INSTITUTION_MISMATCH`; el formulario lo evita ofreciendo
 * solo los departamentos de la institución seleccionada.
 */
export function createAffiliation(
  input: AffiliationInput
): Promise<Affiliation> {
  return post<Affiliation>('/api/admin/affiliations', input)
}

export function updateAffiliation(
  id: string,
  input: Partial<AffiliationInput>
): Promise<Affiliation> {
  return patch<Affiliation>(`/api/admin/affiliations/${id}`, input)
}

export function deleteAffiliation(id: string): Promise<void> {
  return del(`/api/admin/affiliations/${id}`)
}
