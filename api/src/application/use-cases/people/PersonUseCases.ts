import { assertPersonCanBeDeleted } from '../../../domain/institutions/rules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type {
  PeopleRepository,
  PersonInput,
  PersonRecord,
} from '../../ports/repositories/PeopleRepository.js'

/** Personas: propietario del sitio y coautores (ERS §8, RF-006, RN-008). */
export class PersonUseCases {
  constructor(private readonly repo: PeopleRepository) {}

  async list(
    query: PaginationQuery,
    filters: { search: string | null },
  ): Promise<Paginated<PersonRecord>> {
    const { items, totalItems } = await this.repo.listPersons(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<PersonRecord> {
    const encontrada = await this.repo.findPerson(id)
    if (encontrada === null) {
      throw new NotFoundError('The person does not exist.', 'PERSON_NOT_FOUND')
    }
    return encontrada
  }

  /** El perfil del titular del sitio: lo que edita la pantalla "Academic Profile". */
  async getSiteOwner(): Promise<PersonRecord> {
    const propietario = await this.repo.findSiteOwner()
    if (propietario === null) {
      throw new NotFoundError('The site owner has not been configured.', 'SITE_OWNER_NOT_FOUND')
    }
    return propietario
  }

  create(input: PersonInput): Promise<PersonRecord> {
    return this.repo.createPerson(input)
  }

  async update(id: string, input: Partial<PersonInput>): Promise<PersonRecord> {
    await this.get(id)
    return this.repo.updatePerson(id, input)
  }

  async updateSiteOwner(input: Partial<PersonInput>): Promise<PersonRecord> {
    const propietario = await this.getSiteOwner()
    return this.repo.updatePerson(propietario.id, input)
  }

  async delete(id: string): Promise<void> {
    await this.get(id)
    assertPersonCanBeDeleted(await this.repo.countPersonUsage(id))
    await this.repo.deletePerson(id)
  }
}
