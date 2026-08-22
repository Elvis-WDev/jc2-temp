import { escribirConSlugLibre, generateSlug } from '../../../domain/research/Slug.js'
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type {
  EventListFilters,
  EventRecord,
  EventRepository,
  EventWriteInput,
} from '../../ports/repositories/EventRepository.js'
import type { CatalogRepository } from '../../ports/repositories/CatalogRepository.js'

export interface EventActor {
  userId: string | null
  ipAddress: string | null
}

/**
 * Eventos.
 *
 * Comparten las reglas de publicacion del resto del contenido: el estado editorial es
 * la unica puerta de la web (RN-001), y el identificador de un evento publicado no
 * cambia aunque cambie el titulo, para no romper los enlaces compartidos (RN-010).
 */
export class EventUseCases {
  constructor(
    private readonly repo: EventRepository,
    private readonly audit: AuditLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(query: PaginationQuery, filters: EventListFilters): Promise<Paginated<EventRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<EventRecord> {
    const evento = await this.repo.findById(id)
    if (evento === null) {
      throw new NotFoundError('The event does not exist.', 'EVENT_NOT_FOUND')
    }
    return evento
  }

  /** Un evento no puede terminar antes de empezar. */
  private assertFechas(startsAt: Date, endsAt: Date | null | undefined): void {
    if (endsAt !== null && endsAt !== undefined && endsAt < startsAt) {
      throw new ValidationError(
        'The event cannot end before it starts.',
        { endsAt: 'It is earlier than the start.' },
        'EVENT_DATES_REVERSED',
      )
    }
  }

  /** Escribe con un slug libre, reintentando si otra peticion se lo lleva antes. */
  private conSlugLibre<T>(
    base: string,
    exceptId: string | undefined,
    escribir: (slug: string) => Promise<T>,
  ): Promise<T> {
    return escribirConSlugLibre({
      base,
      exceptId,
      existe: (slug, except) => this.repo.slugExists(slug, except),
      escribir,
      // Un evento prefiere fallar a quedarse con un identificador ilegible.
      agotado: () => {
        throw new ValidationError('Could not derive a free identifier.', {}, 'EVENT_SLUG_EXHAUSTED')
      },
    })
  }

  async create(input: EventWriteInput, actor: EventActor): Promise<EventRecord> {
    this.assertFechas(input.startsAt, input.endsAt)

    const base = generateSlug(input.slug === '' ? input.title : input.slug)
    const creado = await this.conSlugLibre(base, undefined, (slug) =>
      this.repo.create({ ...input, slug }),
    )

    await this.audit.record({
      userId: actor.userId,
      action: 'create',
      entityType: 'events',
      entityId: creado.id,
      newData: { title: creado.title, slug: creado.slug },
      ipAddress: actor.ipAddress,
    })

    return creado
  }

  async update(
    id: string,
    input: Partial<EventWriteInput>,
    actor: EventActor,
  ): Promise<EventRecord> {
    const actual = await this.get(id)
    this.assertFechas(input.startsAt ?? actual.startsAt, input.endsAt)

    // RN-010 aplicada al evento: en borrador el identificador sigue al titulo; una vez
    // publicado se queda, para que los enlaces compartidos no dejen de funcionar.
    const actualizado =
      actual.editorialStatus === 'published' || input.title === undefined
        ? await this.repo.update(id, { ...input, slug: actual.slug })
        : await this.conSlugLibre(generateSlug(input.title), id, (slug) =>
            this.repo.update(id, { ...input, slug }),
          )

    await this.audit.record({
      userId: actor.userId,
      action: 'update',
      entityType: 'events',
      entityId: id,
      oldData: { title: actual.title, slug: actual.slug },
      newData: { title: actualizado.title, slug: actualizado.slug },
      ipAddress: actor.ipAddress,
    })

    return actualizado
  }

  async publish(id: string, actor: EventActor): Promise<EventRecord> {
    await this.get(id)
    const publicado = await this.repo.setEditorialStatus(id, 'published', this.now())

    await this.audit.record({
      userId: actor.userId,
      action: 'publish',
      entityType: 'events',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return publicado
  }

  async archive(id: string, actor: EventActor): Promise<EventRecord> {
    const actual = await this.get(id)
    // Se conserva `published_at`: es cuando salio a la web, no cuando se retiro. Aqui
    // decia esto mismo y pasaba `null`, que la borraba: el evento perdia para siempre
    // la fecha en que salio, porque volver a publicarlo sella la de ese momento.
    const archivado = await this.repo.setEditorialStatus(id, 'archived', actual.publishedAt)

    await this.audit.record({
      userId: actor.userId,
      action: 'archive',
      entityType: 'events',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return archivado
  }

  async delete(id: string, actor: EventActor): Promise<void> {
    const evento = await this.get(id)
    await this.repo.delete(id)

    await this.audit.record({
      userId: actor.userId,
      action: 'delete',
      entityType: 'events',
      entityId: id,
      oldData: { title: evento.title },
      ipAddress: actor.ipAddress,
    })
  }
}

/** Consulta publica: solo lo publicado. */
export interface PublicEventList extends Paginated<EventRecord> {
  /** Como se llama cada tipo, en cristiano. Sale del catalogo `event`. */
  typeLabels: Record<string, string>
}

export class PublicEventUseCases {
  constructor(
    private readonly repo: EventRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async list(
    query: PaginationQuery,
    filters: { eventType: string | null; upcoming: boolean | null },
  ): Promise<PublicEventList> {
    const [pagina, tipos] = await Promise.all([
      this.repo.listPublished(query, filters),
      this.tipos(),
    ])
    return { ...paginate(pagina.items, query, pagina.totalItems), typeLabels: tipos }
  }

  async get(idOrSlug: string): Promise<{ event: EventRecord; typeLabels: Record<string, string> }> {
    const [evento, tipos] = await Promise.all([this.repo.findPublished(idOrSlug), this.tipos()])

    if (evento === null) {
      throw new NotFoundError('The event does not exist.', 'EVENT_NOT_FOUND')
    }
    return { event: evento, typeLabels: tipos }
  }

  /**
   * Si hay algun evento publicado.
   *
   * Lo usa el sitio para decidir si ensena la entrada de Eventos en el menu: un menu
   * que lleva a una pagina vacia es peor que un menu de tres entradas.
   */
  async hasPublished(): Promise<boolean> {
    const { totalItems } = await this.repo.listPublished(
      { page: 1, page_size: 1 },
      { eventType: null, upcoming: null },
    )
    return totalItems > 0
  }

  /** Tambien los ocultos: un evento guardado con un tipo oculto conserva su nombre. */
  private async tipos(): Promise<Record<string, string>> {
    const terminos = await this.catalog.list('event', false)
    return Object.fromEntries(terminos.map((termino) => [termino.code, termino.label]))
  }
}
