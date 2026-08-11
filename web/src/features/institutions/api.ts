import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/** Clientes de `/api/admin/institutions` y `/api/admin/departments` (ERS §11-12). */

export interface Institution {
  id: string
  name: string
  shortName: string | null
  slug: string
  websiteUrl: string | null
  countryCode: string | null
  city: string | null
  logoMediaId: string | null
  description: string | null
  /** Color de marca, en hexadecimal. */
  brandColor: string | null
  sortOrder: number
  isActive: boolean
}

export interface Department {
  id: string
  institutionId: string
  /** Viaja con el departamento: el listado completo necesita mostrarlo. */
  institutionName: string
  name: string
  shortName: string | null
  slug: string
  websiteUrl: string | null
  descriptionMarkdown: string | null
  sortOrder: number
  isActive: boolean
}

export interface InstitutionListParams {
  page?: number
  page_size?: number
  /** Busca en el nombre y en las siglas. */
  q?: string
  /** `true` solo las visibles, `false` solo las ocultas, ausente todas. */
  active?: 'true' | 'false'
}

export type InstitutionInput = {
  name: string
  slug: string
  shortName?: string | null
  websiteUrl?: string | null
  countryCode?: string | null
  city?: string | null
  description?: string | null
  brandColor?: string | null
  sortOrder?: number
}

export type DepartmentInput = {
  institutionId: string
  name: string
  slug: string
  shortName?: string | null
  websiteUrl?: string | null
  descriptionMarkdown?: string | null
  sortOrder?: number
  isActive?: boolean
}

export async function listInstitutions(
  params: InstitutionListParams
): Promise<{ items: Institution[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Institution[]>(
    '/api/admin/institutions',
    params
  )
  return { items: data, meta }
}

export function createInstitution(
  input: InstitutionInput
): Promise<Institution> {
  return post<Institution>('/api/admin/institutions', input)
}

export function updateInstitution(
  id: string,
  input: Partial<InstitutionInput>
): Promise<Institution> {
  return patch<Institution>(`/api/admin/institutions/${id}`, input)
}

export function deactivateInstitution(id: string): Promise<Institution> {
  return post<Institution>(`/api/admin/institutions/${id}/deactivate`)
}

/**
 * Volver a mostrar una institucion oculta.
 *
 * No hay endpoint propio como en ocultar: es el PATCH normal cambiando el estado.
 * Se expone aparte para que la pantalla no tenga que saber esa asimetria.
 */
export function activateInstitution(id: string): Promise<Institution> {
  return patch<Institution>(`/api/admin/institutions/${id}`, { isActive: true })
}

export function deleteInstitution(id: string): Promise<void> {
  return del(`/api/admin/institutions/${id}`)
}

/**
 * Departamentos de una institucion.
 *
 * Sin `institutionId` devuelve todos, pero la interfaz siempre lo pasa: es lo que
 * hace que un selector de departamento nunca ofrezca uno de otra institucion, y con
 * eso RN-006 deja de poder intentarse desde el panel.
 */
export function listDepartments(institutionId?: string): Promise<Department[]> {
  return get<Department[]>(
    '/api/admin/departments',
    institutionId === undefined ? undefined : { institutionId }
  )
}

export function createDepartment(input: DepartmentInput): Promise<Department> {
  return post<Department>('/api/admin/departments', input)
}

export function updateDepartment(
  id: string,
  input: Partial<DepartmentInput>
): Promise<Department> {
  return patch<Department>(`/api/admin/departments/${id}`, input)
}

/**
 * Ocultar o volver a mostrar un departamento.
 *
 * A diferencia de las instituciones, no tiene endpoint propio para ocultar: es el PATCH
 * normal cambiando el estado.
 */
export function setDepartmentActive(
  id: string,
  isActive: boolean
): Promise<Department> {
  return patch<Department>(`/api/admin/departments/${id}`, { isActive })
}

export function deleteDepartment(id: string): Promise<void> {
  return del(`/api/admin/departments/${id}`)
}
