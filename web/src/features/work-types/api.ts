import { del, get, patch, post } from '@/lib/api/client'

/** Cliente de `/api/admin/work-types` (ERS §14, RF-003). */

export interface WorkType {
  id: string
  code: string
  label: string
  pluralLabel: string
  sortOrder: number
  /** Cuantos de este tipo salen en la portada. Vacio: sin limite propio. */
  maxItemsHome: number | null
  isActive: boolean
}

export interface WorkTypeCreateInput {
  code: string
  label: string
  pluralLabel: string
  sortOrder?: number
  maxItemsHome?: number | null
}

/** Sin `code`: es inmutable una vez creado. */
export type WorkTypeUpdateInput = Partial<Omit<WorkTypeCreateInput, 'code'>> & {
  isActive?: boolean
}

export function listWorkTypes(activeOnly = false): Promise<WorkType[]> {
  return get<WorkType[]>(
    '/api/admin/work-types',
    activeOnly ? { active: 'true' } : undefined
  )
}

export function createWorkType(input: WorkTypeCreateInput): Promise<WorkType> {
  return post<WorkType>('/api/admin/work-types', input)
}

export function updateWorkType(
  id: string,
  input: WorkTypeUpdateInput
): Promise<WorkType> {
  return patch<WorkType>(`/api/admin/work-types/${id}`, input)
}

export function deactivateWorkType(id: string): Promise<WorkType> {
  return post<WorkType>(`/api/admin/work-types/${id}/deactivate`)
}

/** Volver a mostrar un tipo oculto. Ocultar tiene endpoint propio; mostrar, no. */
export function activateWorkType(id: string): Promise<WorkType> {
  return patch<WorkType>(`/api/admin/work-types/${id}`, { isActive: true })
}

export function deleteWorkType(id: string): Promise<void> {
  return del(`/api/admin/work-types/${id}`)
}
