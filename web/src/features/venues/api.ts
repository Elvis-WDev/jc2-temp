import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/**
 * Cliente de `/api/admin/venues`.
 *
 * La ficha de una revista, editorial o congreso: se escribe una vez y la reutilizan
 * todos los trabajos. Lo que cambia de un artículo a otro —volumen, número, páginas,
 * año— vive en el trabajo, no aquí.
 */

export interface Venue {
  id: string
  name: string
  abbreviation: string | null
  venueType: string | null
  publisherName: string | null
  issn: string | null
  isbnPrefix: string | null
  countryCode: string | null
  websiteUrl: string | null
  /** Texto: cada escala usa su notación (Q1, A*, 4*). */
  ranking: string | null
  citeScore: number | null
  notes: string | null
  isActive: boolean
  sortOrder: number
  /** Cuántos trabajos la citan. */
  workCount: number
}

export interface VenueListParams {
  page?: number
  page_size?: number
  q?: string
  venueType?: string
  active?: 'true' | 'false'
}

export interface VenueInput {
  name: string
  abbreviation?: string | null
  venueType?: string | null
  publisherName?: string | null
  issn?: string | null
  isbnPrefix?: string | null
  countryCode?: string | null
  websiteUrl?: string | null
  ranking?: string | null
  citeScore?: number | null
  notes?: string | null
  isActive?: boolean
}

export async function listVenues(
  params: VenueListParams
): Promise<{ items: Venue[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Venue[]>('/api/admin/venues', params)
  return { items: data, meta }
}

export function getVenue(id: string): Promise<Venue> {
  return get<Venue>(`/api/admin/venues/${id}`)
}

/** El nombre es único: es lo que hace que la ficha se reutilice en vez de duplicarse. */
export function createVenue(input: VenueInput): Promise<Venue> {
  return post<Venue>('/api/admin/venues', input)
}

export function updateVenue(
  id: string,
  input: Partial<VenueInput>
): Promise<Venue> {
  return patch<Venue>(`/api/admin/venues/${id}`, input)
}

/** Citada por algún trabajo, la API responde 409: hay que ocultarla. */
export function deleteVenue(id: string): Promise<void> {
  return del(`/api/admin/venues/${id}`)
}
