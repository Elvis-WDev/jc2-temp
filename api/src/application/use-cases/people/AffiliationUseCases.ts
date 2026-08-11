import { assertDepartmentBelongsToInstitution } from '../../../domain/institutions/rules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import type { InstitutionsRepository } from '../../ports/repositories/InstitutionsRepository.js'
import type {
  AffiliationInput,
  AffiliationRecord,
  PeopleRepository,
} from '../../ports/repositories/PeopleRepository.js'

/**
 * Afiliaciones profesionales (ERS §13, RF-018).
 *
 * Se guardan aparte de la docencia a proposito: el perfil profesional no debe
 * deducirse de los cursos impartidos.
 */
export class AffiliationUseCases {
  constructor(
    private readonly people: PeopleRepository,
    private readonly institutions: InstitutionsRepository,
  ) {}

  list(personId: string, currentOnly: boolean): Promise<AffiliationRecord[]> {
    return this.people.listAffiliations(personId, currentOnly)
  }

  /**
   * Valida la coherencia institucion-departamento antes de tocar la base de datos
   * (RN-006). La clave foranea compuesta lo impediria igualmente, pero el error de
   * PostgreSQL no le dice nada util a quien rellena el formulario.
   */
  private async assertCoherencia(
    institutionId: string,
    // Sin departamento el campo puede llegar ausente (undefined) o vacio (null). Se
    // acepta cualquiera de los dos y se normaliza aqui: si solo se comparara con null,
    // una afiliacion sin departamento intentaria buscar el departamento `undefined`.
    departmentIdEntrante: string | null | undefined,
  ): Promise<void> {
    const departmentId = departmentIdEntrante ?? null

    const institucion = await this.institutions.findInstitution(institutionId)
    if (institucion === null) {
      throw new NotFoundError('The institution does not exist.', 'INSTITUTION_NOT_FOUND')
    }

    const departamento =
      departmentId === null ? null : await this.institutions.findDepartment(departmentId)

    assertDepartmentBelongsToInstitution({
      departmentId,
      departmentInstitutionId: departamento?.institutionId ?? null,
      institutionId,
    })
  }

  async create(input: AffiliationInput): Promise<AffiliationRecord> {
    await this.assertCoherencia(input.institutionId, input.departmentId)
    return this.people.createAffiliation(input)
  }

  async update(id: string, input: Partial<AffiliationInput>): Promise<AffiliationRecord> {
    const actual = await this.people.findAffiliation(id)
    if (actual === null) {
      throw new NotFoundError('The affiliation does not exist.', 'AFFILIATION_NOT_FOUND')
    }

    // Un PATCH puede cambiar solo uno de los dos; la comprobacion usa el par
    // resultante, no el enviado.
    const institutionId = input.institutionId ?? actual.institutionId
    const departmentId = input.departmentId === undefined ? actual.departmentId : input.departmentId

    await this.assertCoherencia(institutionId, departmentId)
    return this.people.updateAffiliation(id, input)
  }

  async delete(id: string): Promise<void> {
    const actual = await this.people.findAffiliation(id)
    if (actual === null) {
      throw new NotFoundError('The affiliation does not exist.', 'AFFILIATION_NOT_FOUND')
    }
    await this.people.deleteAffiliation(id)
  }
}
