import {
  assertDepartmentCanBeDeleted,
  assertDepartmentCanChangeInstitution,
} from '../../../domain/institutions/rules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  DepartmentInput,
  DepartmentRecord,
  InstitutionsRepository,
} from '../../ports/repositories/InstitutionsRepository.js'

/** Departamentos (ERS §12). Siempre cuelgan de una institucion. */
export class DepartmentUseCases {
  constructor(private readonly repo: InstitutionsRepository) {}

  list(institutionId: string | null): Promise<DepartmentRecord[]> {
    return this.repo.listDepartments(institutionId)
  }

  async get(id: string): Promise<DepartmentRecord> {
    const encontrado = await this.repo.findDepartment(id)
    if (encontrado === null) {
      throw new NotFoundError('The department does not exist.', 'DEPARTMENT_NOT_FOUND')
    }
    return encontrado
  }

  async create(input: DepartmentInput): Promise<DepartmentRecord> {
    // La institucion debe existir antes de colgarle un departamento; sin esto el
    // error saldria como violacion de clave foranea, ilegible para el cliente.
    const institucion = await this.repo.findInstitution(input.institutionId)
    if (institucion === null) {
      throw new NotFoundError('The institution does not exist.', 'INSTITUTION_NOT_FOUND')
    }
    return this.repo.createDepartment(input)
  }

  async update(id: string, input: Partial<DepartmentInput>): Promise<DepartmentRecord> {
    const actual = await this.get(id)

    // Cambiar de institucion arrastra consigo a todo lo que cuelga del departamento.
    if (input.institutionId !== undefined && input.institutionId !== actual.institutionId) {
      const destino = await this.repo.findInstitution(input.institutionId)
      if (destino === null) {
        throw new NotFoundError('The institution does not exist.', 'INSTITUTION_NOT_FOUND')
      }
      assertDepartmentCanChangeInstitution(await this.repo.countDepartmentUsage(id))
    }

    return this.repo.updateDepartment(id, input)
  }

  async delete(id: string): Promise<void> {
    await this.get(id)
    assertDepartmentCanBeDeleted(await this.repo.countDepartmentUsage(id))
    await this.repo.deleteDepartment(id)
  }
}
