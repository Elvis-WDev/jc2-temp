import type { PaginationQuery } from '../../../shared/http/pagination.js'

/**
 * Instituciones y departamentos en un mismo puerto: un departamento no existe sin su
 * institucion, asi que forman un solo agregado (RF-017).
 */

export interface InstitutionRecord {
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

export interface DepartmentRecord {
  id: string
  institutionId: string
  /**
   * Nombre de la institucion a la que pertenece.
   *
   * Viaja con el departamento porque un listado de todos los departamentos sin el
   * nombre de su institucion solo tendria un identificador que no dice nada. Resolverlo
   * en el cliente obligaria a traerse antes todas las instituciones.
   */
  institutionName: string
  name: string
  shortName: string | null
  slug: string
  websiteUrl: string | null
  descriptionMarkdown: string | null
  sortOrder: number
  isActive: boolean
}

export interface InstitutionInput {
  name: string
  shortName?: string | null
  slug: string
  websiteUrl?: string | null
  countryCode?: string | null
  city?: string | null
  logoMediaId?: string | null
  description?: string | null
  brandColor?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface DepartmentInput {
  institutionId: string
  name: string
  shortName?: string | null
  slug: string
  websiteUrl?: string | null
  descriptionMarkdown?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface InstitutionUsage {
  departments: number
  affiliations: number
  courseOfferings: number
}

export interface DepartmentUsage {
  affiliations: number
  courseOfferings: number
}

/**
 * `active` tiene tres valores a proposito: `true` solo las visibles, `false` solo las
 * ocultas y `null` todas. Con un booleano no habria forma de pedir las ocultas, que es
 * justo lo que hace falta para volver a mostrarlas.
 */
export interface InstitutionListFilters {
  active: boolean | null
  search: string | null
}

export interface InstitutionsRepository {
  listInstitutions(
    query: PaginationQuery,
    filters: InstitutionListFilters,
  ): Promise<{ items: InstitutionRecord[]; totalItems: number }>
  findInstitution(id: string): Promise<InstitutionRecord | null>
  createInstitution(input: InstitutionInput): Promise<InstitutionRecord>
  updateInstitution(id: string, input: Partial<InstitutionInput>): Promise<InstitutionRecord>
  deleteInstitution(id: string): Promise<void>
  countInstitutionUsage(id: string): Promise<InstitutionUsage>

  listDepartments(institutionId: string | null): Promise<DepartmentRecord[]>
  findDepartment(id: string): Promise<DepartmentRecord | null>
  createDepartment(input: DepartmentInput): Promise<DepartmentRecord>
  updateDepartment(id: string, input: Partial<DepartmentInput>): Promise<DepartmentRecord>
  deleteDepartment(id: string): Promise<void>
  countDepartmentUsage(id: string): Promise<DepartmentUsage>
}
