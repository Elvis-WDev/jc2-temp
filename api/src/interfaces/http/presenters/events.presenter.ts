import type { EventRecord } from '../../../application/ports/repositories/EventRepository.js'
import { renderMarkdown } from '../../../shared/markdown/render.js'

/**
 * Capa 3 del blindaje: lista blanca explicita.
 *
 * Nunca sale `editorialStatus`, `sortOrder` ni el identificador de la imagen en crudo.
 */
export function toPublicEventDto(
  evento: EventRecord,
  baseUrl: string,
  typeLabels: Record<string, string> = {},
) {
  return {
    id: evento.id,
    slug: evento.slug,
    title: evento.title,
    type: evento.eventType,
    // El nombre del catalogo; el codigo crudo solo si nadie lo ha definido.
    typeLabel:
      evento.eventType === null ? null : (typeLabels[evento.eventType] ?? evento.eventType),
    summary: evento.summary,
    contentHtml: renderMarkdown(evento.contentMarkdown),
    startsAt: evento.startsAt.toISOString(),
    endsAt: evento.endsAt === null ? null : evento.endsAt.toISOString(),
    location: evento.location,
    organizer: evento.organizer,
    imageUrl:
      evento.imageMediaId === null ? null : `${baseUrl}/api/public/media/${evento.imageMediaId}`,
    imageAlt: evento.imageAlt,
    button:
      evento.buttonUrl === null
        ? null
        : { label: evento.buttonLabel, url: evento.buttonUrl, color: evento.buttonColor },
    isMain: evento.isMain,
    institutions: evento.institutions.map((institucion) => institucion.name),
  }
}
