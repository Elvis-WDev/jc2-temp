import {
  del,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/** Cliente de `/api/admin/persons` (ERS §8). Personas: titular del sitio y coautores. */

export interface Person {
  id: string
  isSiteOwner: boolean
  fullName: string
  givenName: string | null
  familyName: string | null
  preferredName: string | null
  professionalTitle: string | null
  publicEmail: string | null
  orcid: string | null
  sortName: string | null
}

export interface PersonListParams {
  page?: number
  page_size?: number
  q?: string
}

export interface PersonCreateInput {
  fullName: string
  givenName?: string | null
  familyName?: string | null
  orcid?: string | null
  sortName?: string | null
}

export async function listPersons(
  params: PersonListParams
): Promise<{ items: Person[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Person[]>(
    '/api/admin/persons',
    params
  )
  return { items: data, meta }
}

/** Búsqueda para el selector de autores: devuelve solo la lista. */
export async function searchPersons(q: string): Promise<Person[]> {
  const { items } = await listPersons({
    page: 1,
    page_size: 20,
    ...(q === '' ? {} : { q }),
  })
  return items
}

export function createPerson(input: PersonCreateInput): Promise<Person> {
  return post<Person>('/api/admin/persons', input)
}

export function updatePerson(
  id: string,
  input: Partial<PersonCreateInput>
): Promise<Person> {
  return patch<Person>(`/api/admin/persons/${id}`, input)
}

/** El servidor lo rechaza si la persona figura como autora en algun trabajo. */
export function deletePerson(id: string): Promise<void> {
  return del(`/api/admin/persons/${id}`)
}
