import { del, get, patch, post, put } from '@/lib/api/client'

/**
 * Estilos de cita y las citas escritas a mano para cada trabajo.
 *
 * El BibTeX que genera el sistema sigue como estaba. Esto es para cuando la editorial
 * publica una forma de citar concreta y quieres ofrecerla tal cual.
 */

export interface CitationStyle {
  id: string
  code: string
  name: string
  /** Extensión al descargar la cita (bib, ris). Vacía si es texto plano. */
  extension: string | null
  sortOrder: number
  isActive: boolean
}

export interface WorkCitation {
  id: string
  workId: string
  citationStyleId: string
  styleCode: string
  styleName: string
  content: string
}

export function listCitationStyles(
  activeOnly = false
): Promise<CitationStyle[]> {
  return get<CitationStyle[]>(
    '/api/admin/citation-styles',
    activeOnly ? { active: 'true' } : undefined
  )
}

export function createCitationStyle(input: {
  code: string
  name: string
  extension?: string | null
}): Promise<CitationStyle> {
  return post<CitationStyle>('/api/admin/citation-styles', input)
}

export function updateCitationStyle(
  id: string,
  input: {
    name?: string
    extension?: string | null
    sortOrder?: number
    isActive?: boolean
  }
): Promise<CitationStyle> {
  return patch<CitationStyle>(`/api/admin/citation-styles/${id}`, input)
}

export function deleteCitationStyle(id: string): Promise<void> {
  return del(`/api/admin/citation-styles/${id}`)
}

export function listWorkCitations(workId: string): Promise<WorkCitation[]> {
  return get<WorkCitation[]>(`/api/admin/works/${workId}/citations`)
}

/** Crea o reemplaza: no hay dos citas del mismo trabajo en el mismo estilo. */
export function saveWorkCitation(
  workId: string,
  styleId: string,
  content: string
): Promise<WorkCitation> {
  return put<WorkCitation>(`/api/admin/works/${workId}/citations/${styleId}`, {
    content,
  })
}

export function deleteWorkCitation(
  workId: string,
  styleId: string
): Promise<void> {
  return del(`/api/admin/works/${workId}/citations/${styleId}`)
}
