import { NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  PeopleRepository,
  PersonLinkInput,
  PersonLinkRecord,
} from '../../ports/repositories/PeopleRepository.js'

/**
 * Enlaces de una persona (ERS §9).
 *
 * RF-001 pide LinkedIn, GitHub y "otros enlaces configurables", que no tienen columna
 * propia en `persons`: viven aqui para poder anadir redes sin migrar el esquema.
 */
export class PersonLinkUseCases {
  constructor(private readonly repo: PeopleRepository) {}

  list(personId: string, publicOnly: boolean): Promise<PersonLinkRecord[]> {
    return this.repo.listPersonLinks(personId, publicOnly)
  }

  async create(input: PersonLinkInput): Promise<PersonLinkRecord> {
    const persona = await this.repo.findPerson(input.personId)
    if (persona === null) {
      throw new NotFoundError('The person does not exist.', 'PERSON_NOT_FOUND')
    }
    return this.repo.createPersonLink(input)
  }

  update(id: string, input: Partial<PersonLinkInput>): Promise<PersonLinkRecord> {
    return this.repo.updatePersonLink(id, input)
  }

  delete(id: string): Promise<void> {
    return this.repo.deletePersonLink(id)
  }
}
