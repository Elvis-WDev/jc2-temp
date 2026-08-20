import { del, get, patch, post } from '@/lib/api/client'

/**
 * Cliente de `/api/admin/person-links`.
 *
 * Son los enlaces que acompañan al perfil público: web personal, redes académicas,
 * repositorios. Distintos de los enlaces de un trabajo, que cuelgan del trabajo.
 */

export interface PersonLink {
  id: string
  personId: string
  linkType: string
  label: string | null
  url: string
  iconKey: string | null
  /** Logotipo subido. Es lo que la web pinta junto al enlace. */
  iconMediaId: string | null
  isPublic: boolean
  sortOrder: number
}

export interface PersonLinkInput {
  personId: string
  linkType: string
  label?: string | null
  url: string
  iconKey?: string | null
  iconMediaId?: string | null
  isPublic?: boolean
  sortOrder?: number
}

export function listPersonLinks(personId: string): Promise<PersonLink[]> {
  return get<PersonLink[]>('/api/admin/person-links', { personId })
}

export function createPersonLink(input: PersonLinkInput): Promise<PersonLink> {
  return post<PersonLink>('/api/admin/person-links', input)
}

export function updatePersonLink(
  id: string,
  input: Partial<PersonLinkInput>
): Promise<PersonLink> {
  return patch<PersonLink>(`/api/admin/person-links/${id}`, input)
}

export function deletePersonLink(id: string): Promise<void> {
  return del(`/api/admin/person-links/${id}`)
}
