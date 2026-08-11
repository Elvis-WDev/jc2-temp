import { assertInstitutionCanBeDeleted } from '../../../domain/institutions/rules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type {
  InstitutionInput,
  InstitutionListFilters,
  InstitutionRecord,
  InstitutionsRepository,
} from '../../ports/repositories/InstitutionsRepository.js'

/** Instituciones (ERS §11, RN-007). */
export class InstitutionUseCases {
  constructor(private readonly repo: InstitutionsRepository) {}

  async list(
    query: PaginationQuery,
    filters: InstitutionListFilters,
  ): Promise<Paginated<InstitutionRecord>> {
    const { items, totalItems } = await this.repo.listInstitutions(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<InstitutionRecord> {
    const encontrada = await this.repo.findInstitution(id)
    if (encontrada === null) {
      throw new NotFoundError('The institution does not exist.', 'INSTITUTION_NOT_FOUND')
    }
    return encontrada
  }

  create(input: InstitutionInput): Promise<InstitutionRecord> {
    return this.repo.createInstitution(input)
  }

  async update(id: string, input: Partial<InstitutionInput>): Promise<InstitutionRecord> {
    await this.get(id)
    return this.repo.updateInstitution(id, input)
  }

  /**
   * RN-007: si hay referencias no se borra. La alternativa que ofrece el ERS es
   * desactivar, que conserva el historico academico en lugar de destruirlo.
   */
  async delete(id: string): Promise<void> {
    await this.get(id)
    assertInstitutionCanBeDeleted(await this.repo.countInstitutionUsage(id))
    await this.repo.deleteInstitution(id)
  }

  async deactivate(id: string): Promise<InstitutionRecord> {
    await this.get(id)
    return this.repo.updateInstitution(id, { isActive: false })
  }
}
