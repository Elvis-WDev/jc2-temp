import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Eventos: seminarios, congresos, defensas y convocatorias. */

export interface EventRecord {
  id: string
  title: string
  slug: string
  eventType: string | null
  summary: string | null
  contentMarkdown: string | null
  startsAt: Date
  endsAt: Date | null
  location: string | null
  organizer: string | null
  imageMediaId: string | null
  imageAlt: string | null
  buttonLabel: string | null
  buttonUrl: string | null
  buttonColor: string | null
  isMain: boolean
  editorialStatus: string
  publishedAt: Date | null
  sortOrder: number | null
  institutions: Array<{ id: string; name: string }>
}

export interface EventWriteInput {
  title: string
  slug: string
  eventType?: string | null
  summary?: string | null
  contentMarkdown?: string | null
  startsAt: Date
  endsAt?: Date | null
  location?: string | null
  organizer?: string | null
  imageMediaId?: string | null
  imageAlt?: string | null
  buttonLabel?: string | null
  buttonUrl?: string | null
  buttonColor?: string | null
  isMain?: boolean
  sortOrder?: number | null
  institutionIds?: string[]
}

export interface EventListFilters {
  search: string | null
  eventType: string | null
  editorialStatus: string | null
}

export interface EventRepository {
  list(
    query: PaginationQuery,
    filters: EventListFilters,
  ): Promise<{ items: EventRecord[]; totalItems: number }>
  findById(id: string): Promise<EventRecord | null>
  slugExists(slug: string, exceptId?: string): Promise<boolean>
  create(input: EventWriteInput): Promise<EventRecord>
  update(id: string, input: Partial<EventWriteInput>): Promise<EventRecord>
  delete(id: string): Promise<void>
  setEditorialStatus(id: string, status: string, publishedAt: Date | null): Promise<EventRecord>

  /** Solo publicados, para la web. */
  listPublished(
    query: PaginationQuery,
    filters: { eventType: string | null; upcoming: boolean | null },
  ): Promise<{ items: EventRecord[]; totalItems: number }>
  findPublished(idOrSlug: string): Promise<EventRecord | null>
}
