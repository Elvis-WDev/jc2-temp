import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type {
  VenueInput,
  VenueListFilters,
  VenueRecord,
  VenueRepository,
} from '../../ports/repositories/VenueRepository.js'

/**
 * Revistas y editoriales.
 *
 * El nombre es unico a proposito: es lo que hace que la ficha se reutilice en vez de
 * duplicarse cada vez que alguien lo escribe. Sin eso volveriamos al problema que esta
 * tabla vino a resolver.
 */
export class VenueUseCases {
  constructor(private readonly repo: VenueRepository) {}

  async list(query: PaginationQuery, filters: VenueListFilters): Promise<Paginated<VenueRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<VenueRecord> {
    const revista = await this.repo.findById(id)
    if (revista === null) {
      throw new NotFoundError('The venue does not exist.', 'VENUE_NOT_FOUND')
    }
    return revista
  }

  private async assertNombreLibre(name: string, exceptId?: string): Promise<void> {
    const existente = await this.repo.findByName(name.trim())
    if (existente !== null && existente.id !== exceptId) {
      throw new ConflictError(`A venue named "${name.trim()}" already exists.`, 'VENUE_NAME_TAKEN')
    }
  }

  async create(input: VenueInput): Promise<VenueRecord> {
    await this.assertNombreLibre(input.name)
    return this.repo.create({ ...input, name: input.name.trim() })
  }

  async update(id: string, input: Partial<VenueInput>): Promise<VenueRecord> {
    await this.get(id)
    if (input.name !== undefined) {
      await this.assertNombreLibre(input.name, id)
    }
    return this.repo.update(
      id,
      input.name === undefined ? input : { ...input, name: input.name.trim() },
    )
  }

  /**
   * Una revista citada por algun trabajo no se borra. La clave foranea lo impediria de
   * todos modos, pero el mensaje de PostgreSQL no dice cuantos trabajos la usan ni
   * ofrece la alternativa, que es ocultarla.
   */
  async delete(id: string): Promise<void> {
    await this.get(id)
    const enUso = await this.repo.countWorks(id)
    if (enUso > 0) {
      throw new ConflictError(
        `The venue is cited by ${String(enUso)} works. Hide it instead of deleting it.`,
        'VENUE_IN_USE',
      )
    }
    await this.repo.delete(id)
  }
}
