import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/**
 * Cliente de `/api/admin/events`.
 *
 * Seminarios, congresos, defensas y convocatorias. Se rigen por el mismo estado
 * editorial que trabajos y cursos: la web solo ve los publicados.
 */

export type EditorialStatus = 'draft' | 'published' | 'archived'

export interface EventItem {
  id: string
  title: string
  slug: string
  eventType: string | null
  summary: string | null
  contentMarkdown: string | null
  /** Instante ISO: un seminario tiene hora, y esa hora importa. */
  startsAt: string
  endsAt: string | null
  location: string | null
  organizer: string | null
  imageMediaId: string | null
  imageAlt: string | null
  buttonLabel: string | null
  buttonUrl: string | null
  /** Hexadecimal: pertenece a la identidad del evento, no a la paleta del panel. */
  buttonColor: string | null
  isMain: boolean
  editorialStatus: EditorialStatus
  publishedAt: string | null
  sortOrder: number | null
  institutions: Array<{ id: string; name: string }>
}

export interface EventListParams {
  page?: number
  page_size?: number
  q?: string
  eventType?: string
  status?: EditorialStatus
}

export interface EventWriteInput {
  title: string
  slug?: string
  eventType?: string | null
  summary?: string | null
  contentMarkdown?: string | null
  startsAt: string
  endsAt?: string | null
  location?: string | null
  organizer?: string | null
  imageMediaId?: string | null
  imageAlt?: string | null
  buttonLabel?: string | null
  buttonUrl?: string | null
  buttonColor?: string | null
  isMain?: boolean
  institutionIds?: string[]
}

export async function listEvents(
  params: EventListParams
): Promise<{ items: EventItem[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<EventItem[]>(
    '/api/admin/events',
    params
  )
  return { items: data, meta }
}

export function getEvent(id: string): Promise<EventItem> {
  return get<EventItem>(`/api/admin/events/${id}`)
}

export function createEvent(input: EventWriteInput): Promise<EventItem> {
  return post<EventItem>('/api/admin/events', input)
}

export function updateEvent(
  id: string,
  input: Partial<EventWriteInput>
): Promise<EventItem> {
  return patch<EventItem>(`/api/admin/events/${id}`, input)
}

export function deleteEvent(id: string): Promise<void> {
  return del(`/api/admin/events/${id}`)
}

export function publishEvent(id: string): Promise<EventItem> {
  return post<EventItem>(`/api/admin/events/${id}/publish`)
}

export function archiveEvent(id: string): Promise<EventItem> {
  return post<EventItem>(`/api/admin/events/${id}/archive`)
}
