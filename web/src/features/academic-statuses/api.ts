import { del, get, patch, post } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/academic-statuses`.
 *
 * Antes era una lista cerrada de ocho valores fijos en la base de datos. Ahora se
 * pueden crear los que hagan falta: describen la madurez de un trabajo y no deciden
 * nada sobre su visibilidad, de eso se encarga el estado editorial.
 */

export const TONOS = [
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
] as const
export type Tono = (typeof TONOS)[number]

export const NOMBRE_DE_TONO: Record<Tono, string> = {
  success: 'Verde',
  warning: 'Ambar',
  danger: 'Rojo',
  info: 'Azul',
  neutral: 'Gris',
}

export interface AcademicStatus {
  id: string
  code: string
  label: string
  tone: Tono
  sortOrder: number
  isActive: boolean
}

export interface AcademicStatusCreateInput {
  code: string
  label: string
  tone?: Tono
  sortOrder?: number
}

export type AcademicStatusUpdateInput = {
  label?: string
  tone?: Tono
  sortOrder?: number
  isActive?: boolean
}

export function listAcademicStatuses(
  activeOnly = false
): Promise<AcademicStatus[]> {
  return get<AcademicStatus[]>(
    '/api/admin/academic-statuses',
    activeOnly ? { active: 'true' } : undefined
  )
}

export function createAcademicStatus(
  input: AcademicStatusCreateInput
): Promise<AcademicStatus> {
  return post<AcademicStatus>('/api/admin/academic-statuses', input)
}

/** El código no se puede cambiar: viaja en la dirección pública `?status=`. */
export function updateAcademicStatus(
  id: string,
  input: AcademicStatusUpdateInput
): Promise<AcademicStatus> {
  return patch<AcademicStatus>(`/api/admin/academic-statuses/${id}`, input)
}

/** Con trabajos que lo usan, la API responde 409: hay que ocultarlo. */
export function deleteAcademicStatus(id: string): Promise<void> {
  return del(`/api/admin/academic-statuses/${id}`)
}
