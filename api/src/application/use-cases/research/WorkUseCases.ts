import { normalizeDoi } from '../../../domain/research/Doi.js'
import { generateSlug, resolveSlugOnUpdate, withSuffix } from '../../../domain/research/Slug.js'
import {
  assertAuthorOrderIsContiguous,
  assertCanBeFeatured,
  assertCanBeInCarousel,
  assertCanBePublished,
  assertPublicationYearInRange,
  assertVenueIsEitherLinkedOrTyped,
  featuredStateAfterUnpublish,
} from '../../../domain/research/WorkRules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type {
  WorkRecord,
  WorkRepository,
  WorkWriteInput,
} from '../../ports/repositories/WorkRepository.js'

/** Intentos maximos para desambiguar un slug antes de rendirse. */
const MAX_INTENTOS_SLUG = 50

export interface WorkActor {
  userId: string | null
  ipAddress: string | null
}

/**
 * Casos de uso administrativos de Research.
 *
 * Todas las invariantes se aplican aqui llamando al dominio: normalizacion de DOI,
 * estabilidad del slug, rango del ano, autoria minima y coherencia de destacados.
 */
export class WorkUseCases {
  constructor(
    private readonly repo: WorkRepository,
    private readonly audit: AuditLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<Paginated<WorkRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<WorkRecord> {
    const work = await this.repo.findById(id)
    if (work === null) throw new NotFoundError('The work does not exist.', 'WORK_NOT_FOUND')
    return work
  }

  /** Busca un slug libre anadiendo sufijo numerico: `mi-titulo`, `mi-titulo-2`... */
  private async slugLibre(base: string, exceptId?: string): Promise<string> {
    for (let intento = 1; intento <= MAX_INTENTOS_SLUG; intento += 1) {
      const candidato = withSuffix(base, intento)
      if (!(await this.repo.slugExists(candidato, exceptId))) return candidato
    }
    // Con 50 titulos identicos, el determinismo deja de importar mas que no fallar.
    return `${base.slice(0, 190)}-${Date.now().toString(36)}`
  }

  private normalizar(input: Partial<WorkWriteInput>): Partial<WorkWriteInput> {
    const normalizado: Partial<WorkWriteInput> = { ...input }

    // RN-009: el DOI se guarda sin prefijo de URL, siempre.
    if ('doi' in input) normalizado.doi = normalizeDoi(input.doi)

    assertPublicationYearInRange(input.publicationYear, this.now())
    assertVenueIsEitherLinkedOrTyped(input)

    if (input.authors !== undefined) {
      assertAuthorOrderIsContiguous(input.authors.map((autor) => autor.authorOrder))
    }

    return normalizado
  }

  async create(input: WorkWriteInput, actor: WorkActor): Promise<WorkRecord> {
    const normalizado = this.normalizar(input)
    const slug = await this.slugLibre(generateSlug(input.slug === '' ? input.title : input.slug))

    const creado = await this.repo.create({ ...input, ...normalizado, slug })

    await this.audit.record({
      userId: actor.userId,
      action: 'create',
      entityType: 'works',
      entityId: creado.id,
      newData: { title: creado.title, slug: creado.slug },
      ipAddress: actor.ipAddress,
    })

    return creado
  }

  async update(
    id: string,
    input: Partial<WorkWriteInput> & { slug?: string },
    actor: WorkActor,
  ): Promise<WorkRecord> {
    const actual = await this.get(id)
    const normalizado = this.normalizar(input)

    // RN-010: un slug ya publicado no cambia aunque cambie el titulo.
    const slugDeseado = resolveSlugOnUpdate({
      slugActual: actual.slug,
      slugSolicitado: input.slug,
      tituloNuevo: input.title,
      yaPublicado: actual.editorialStatus === 'published',
    })

    const slug = slugDeseado === actual.slug ? actual.slug : await this.slugLibre(slugDeseado, id)

    const actualizado = await this.repo.update(id, { ...normalizado, slug })

    await this.audit.record({
      userId: actor.userId,
      action: 'update',
      entityType: 'works',
      entityId: id,
      oldData: { title: actual.title, slug: actual.slug },
      newData: { title: actualizado.title, slug: actualizado.slug },
      ipAddress: actor.ipAddress,
    })

    return actualizado
  }

  /** RN-002: no se publica sin al menos un autor. */
  async publish(id: string, actor: WorkActor): Promise<WorkRecord> {
    await this.get(id)
    assertCanBePublished({ authorCount: await this.repo.countAuthors(id) })

    const publicado = await this.repo.setEditorialStatus(id, 'published', {
      publishedAt: this.now(),
      archivedAt: null,
    })

    await this.audit.record({
      userId: actor.userId,
      action: 'publish',
      entityType: 'works',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return publicado
  }

  /**
   * Archivar retira el trabajo de Home ademas de ocultarlo: mantener `is_featured`
   * sobre algo archivado dejaria RN-003 rota de forma silenciosa.
   */
  async archive(id: string, actor: WorkActor): Promise<WorkRecord> {
    await this.get(id)

    const archivado = await this.repo.setEditorialStatus(id, 'archived', {
      archivedAt: this.now(),
      ...featuredStateAfterUnpublish(),
    })

    await this.audit.record({
      userId: actor.userId,
      action: 'archive',
      entityType: 'works',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return archivado
  }

  /** RN-003: solo se destaca lo publicado. */
  async setFeatured(
    id: string,
    isFeatured: boolean,
    featuredOrder: number | null,
  ): Promise<WorkRecord> {
    const actual = await this.get(id)
    if (isFeatured) assertCanBeFeatured({ editorialStatus: actual.editorialStatus })

    return this.repo.setFeatured(id, isFeatured, isFeatured ? featuredOrder : null)
  }

  /**
   * El carrusel de la portada.
   *
   * Seleccion aparte de los destacados: un trabajo puede estar en las dos, en una o en
   * ninguna. La regla es la misma —solo lo publicado— porque el carrusel se ve igual de
   * publicamente que la lista.
   */
  async setCarousel(
    id: string,
    isCarousel: boolean,
    carouselOrder: number | null,
  ): Promise<WorkRecord> {
    const actual = await this.get(id)
    if (isCarousel) assertCanBeInCarousel({ editorialStatus: actual.editorialStatus })

    return this.repo.setCarousel(id, isCarousel, isCarousel ? carouselOrder : null)
  }

  async delete(id: string, actor: WorkActor): Promise<void> {
    const actual = await this.get(id)
    await this.repo.delete(id)

    await this.audit.record({
      userId: actor.userId,
      action: 'delete',
      entityType: 'works',
      entityId: id,
      oldData: { title: actual.title, slug: actual.slug },
      ipAddress: actor.ipAddress,
    })
  }
}
