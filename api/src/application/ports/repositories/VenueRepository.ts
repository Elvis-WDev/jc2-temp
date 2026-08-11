import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Revistas, editoriales, congresos y series donde aparece un trabajo. */

export interface VenueRecord {
  id: string
  name: string
  abbreviation: string | null
  venueType: string | null
  publisherName: string | null
  issn: string | null
  isbnPrefix: string | null
  countryCode: string | null
  websiteUrl: string | null
  /** Texto: cada escala usa su notacion (Q1, A*, 4*). */
  ranking: string | null
  citeScore: number | null
  notes: string | null
  isActive: boolean
  sortOrder: number
  /** Cuantos trabajos la citan. Sirve para avisar antes de borrarla. */
  workCount: number
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
  sortOrder?: number
}

export interface VenueListFilters {
  search: string | null
  venueType: string | null
  active: boolean | null
}

export interface VenueRepository {
  list(
    query: PaginationQuery,
    filters: VenueListFilters,
  ): Promise<{ items: VenueRecord[]; totalItems: number }>
  findById(id: string): Promise<VenueRecord | null>
  findByName(name: string): Promise<VenueRecord | null>
  create(input: VenueInput): Promise<VenueRecord>
  update(id: string, input: Partial<VenueInput>): Promise<VenueRecord>
  delete(id: string): Promise<void>
  countWorks(id: string): Promise<number>
}
