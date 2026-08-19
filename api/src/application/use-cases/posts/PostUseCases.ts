import {
  escribirConSlugLibre,
  generateSlug,
  resolveSlugOnUpdate,
} from '../../../domain/research/Slug.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type { CatalogRepository } from '../../ports/repositories/CatalogRepository.js'
import type {
  PostListFilters,
  PostRecord,
  PostRepository,
  PostWriteInput,
} from '../../ports/repositories/PostRepository.js'

export interface PostActor {
  userId: string | null
  ipAddress: string | null
}

/**
 * Noticias y entradas de blog.
 *
 * Las dos formas comparten estas reglas porque comparten entidad: el estado editorial es
 * la unica puerta de la web (RN-001) y el identificador de una entrada publicada no
 * cambia aunque cambie el titulo, para no romper los enlaces que ya circulan (RN-010).
 *
 * Lo que las distingue —que una noticia no lleva cuerpo ni adjuntos— es cosa del
 * formulario, no del dominio: aqui no se prohibe nada que la base admita.
 */
export class PostUseCases {
  constructor(
    private readonly repo: PostRepository,
    private readonly audit: AuditLogger,
    private readonly catalog: CatalogRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(query: PaginationQuery, filters: PostListFilters): Promise<Paginated<PostRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<PostRecord> {
    const post = await this.repo.findById(id)
    if (post === null) {
      throw new NotFoundError('The entry does not exist.', 'POST_NOT_FOUND')
    }
    return post
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
      // Con 50 titulos identicos, el determinismo deja de importar mas que no fallar.
      agotado: () => escribir(`${base.slice(0, 190)}-${Date.now().toString(36)}`),
    })
  }

  async create(
    input: Omit<PostWriteInput, 'slug'> & { slug?: string },
    actor: PostActor,
  ): Promise<PostRecord> {
    const creado = await this.conSlugLibre(
      generateSlug(input.slug === undefined || input.slug === '' ? input.title : input.slug),
      undefined,
      (slug) => this.repo.create({ ...input, slug }, actor.userId),
    )

    await this.audit.record({
      userId: actor.userId,
      action: 'create',
      entityType: 'posts',
      entityId: creado.id,
      newData: { kind: creado.kind, title: creado.title, slug: creado.slug },
      ipAddress: actor.ipAddress,
    })

    return creado
  }

  async update(id: string, input: Partial<PostWriteInput>, actor: PostActor): Promise<PostRecord> {
    const actual = await this.get(id)

    // RN-010: un slug ya publicado no cambia aunque cambie el titulo.
    const slugDeseado = resolveSlugOnUpdate({
      slugActual: actual.slug,
      slugSolicitado: input.slug,
      tituloNuevo: input.title,
      yaPublicado: actual.editorialStatus === 'published',
    })

    const actualizado =
      slugDeseado === actual.slug
        ? await this.repo.update(id, { ...input, slug: actual.slug }, actor.userId)
        : await this.conSlugLibre(slugDeseado, id, (slug) =>
            this.repo.update(id, { ...input, slug }, actor.userId),
          )

    await this.audit.record({
      userId: actor.userId,
      action: 'update',
      entityType: 'posts',
      entityId: id,
      oldData: { title: actual.title, slug: actual.slug },
      newData: { title: actualizado.title, slug: actualizado.slug },
      ipAddress: actor.ipAddress,
    })

    return actualizado
  }

  async publish(id: string, actor: PostActor): Promise<PostRecord> {
    await this.get(id)
    const publicado = await this.repo.setEditorialStatus(id, 'published', this.now())

    await this.audit.record({
      userId: actor.userId,
      action: 'publish',
      entityType: 'posts',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return publicado
  }

  async archive(id: string, actor: PostActor): Promise<PostRecord> {
    const actual = await this.get(id)
    // Se conserva `published_at` de verdad: es cuando salio a la web, no cuando se
    // retiro. Pasando `null` se perderia, y con el la fecha que ordena el listado.
    const archivado = await this.repo.setEditorialStatus(id, 'archived', actual.publishedAt)

    await this.audit.record({
      userId: actor.userId,
      action: 'archive',
      entityType: 'posts',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return archivado
  }

  async delete(id: string, actor: PostActor): Promise<void> {
    const post = await this.get(id)
    await this.repo.delete(id)

    await this.audit.record({
      userId: actor.userId,
      action: 'delete',
      entityType: 'posts',
      entityId: id,
      oldData: { kind: post.kind, title: post.title },
      ipAddress: actor.ipAddress,
    })
  }

  // --- Lo que ve la web ---

  async listPublished(
    query: PaginationQuery,
    filters: { kind: string | null },
  ): Promise<Paginated<PostRecord> & { kindLabels: Record<string, string> }> {
    const [pagina, rotulos] = await Promise.all([
      this.repo.listPublished(query, filters),
      this.rotulos(),
    ])
    return { ...paginate(pagina.items, query, pagina.totalItems), kindLabels: rotulos }
  }

  async getPublished(
    idOrSlug: string,
  ): Promise<{ post: PostRecord; kindLabels: Record<string, string> }> {
    const [post, rotulos] = await Promise.all([this.repo.findPublished(idOrSlug), this.rotulos()])

    if (post === null) {
      // Mismo error que si no existiera: que este en borrador no es asunto del visitante.
      throw new NotFoundError('The entry does not exist.', 'POST_NOT_FOUND')
    }
    return { post, kindLabels: rotulos }
  }

  /**
   * Si hay alguna entrada publicada de ese tipo.
   *
   * Lo usa el sitio para decidir si ensena «News» o «Blog» en el menu: igual que en
   * eventos, una entrada de menu que lleva a una pagina vacia estorba tanto como una
   * que lleva a una pagina oculta.
   */
  async hasPublished(kind: string): Promise<boolean> {
    const { totalItems } = await this.repo.listPublished({ page: 1, page_size: 1 }, { kind })
    return totalItems > 0
  }

  /** Los publicados, con lo justo para construir sus direcciones en el sitemap. */
  listPublishedRefs(): Promise<Array<{ kind: string; slug: string }>> {
    return this.repo.listPublishedSlugs()
  }

  /** Tambien los ocultos: una entrada guardada con un tipo oculto conserva su nombre. */
  private async rotulos(): Promise<Record<string, string>> {
    const terminos = await this.catalog.list('post_kind', false)
    return Object.fromEntries(terminos.map((termino) => [termino.code, termino.label]))
  }
}
