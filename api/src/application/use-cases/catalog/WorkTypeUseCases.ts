import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js'
import type {
  WorkTypeCreateInput,
  WorkTypeRecord,
  WorkTypeRepository,
  WorkTypeUpdateInput,
} from '../../ports/repositories/WorkTypeRepository.js'

/**
 * Tipos de trabajo (ERS §14, RF-003: "anadir nuevos tipos sin modificar la estructura
 * principal de works").
 */
export class WorkTypeUseCases {
  constructor(private readonly repo: WorkTypeRepository) {}

  list(activeOnly: boolean): Promise<WorkTypeRecord[]> {
    return this.repo.list(activeOnly)
  }

  async get(id: string): Promise<WorkTypeRecord> {
    const tipo = await this.repo.findById(id)
    if (tipo === null) {
      throw new NotFoundError('The work type does not exist.', 'WORK_TYPE_NOT_FOUND')
    }
    return tipo
  }

  async create(input: WorkTypeCreateInput): Promise<WorkTypeRecord> {
    const existente = await this.repo.findByCode(input.code)
    if (existente !== null) {
      throw new ConflictError(
        `A work type with code "${input.code}" already exists.`,
        'WORK_TYPE_CODE_TAKEN',
        { code: 'This code is already in use.', existingWorkTypeId: existente.id },
      )
    }

    return this.repo.create(input)
  }

  /**
   * El `code` NO se puede cambiar.
   *
   * Es la clave que usa el filtro publico `?type=journal_article` y el mapeo a tipo de
   * entrada BibTeX. Cambiarlo rompería enlaces compartidos y citas ya generadas, sin
   * que nada avisara. Para "renombrar" un tipo se edita su `label`, que es lo que ve
   * el usuario; el `code` es identidad interna.
   */
  async update(id: string, input: WorkTypeUpdateInput): Promise<WorkTypeRecord> {
    await this.get(id)
    return this.repo.update(id, input)
  }

  async deactivate(id: string): Promise<WorkTypeRecord> {
    await this.get(id)
    return this.repo.update(id, { isActive: false })
  }

  /** Borrar solo si ningun trabajo lo usa; si no, desactivar (mismo criterio que RN-007). */
  async delete(id: string): Promise<void> {
    await this.get(id)

    const enUso = await this.repo.countWorks(id)
    if (enUso > 0) {
      throw new ConflictError(
        `The work type is used by ${enUso} works. Deactivate it instead of deleting it.`,
        'WORK_TYPE_IN_USE',
      )
    }

    await this.repo.delete(id)
  }

  /** El codigo es identidad tecnica: minusculas, digitos y guion bajo. */
  static assertValidCode(code: string): void {
    if (!/^[a-z][a-z0-9_]{1,49}$/.test(code)) {
      throw new ValidationError(
        'The code must be lowercase letters, digits and underscores.',
        { code: 'Invalid code format.' },
        'WORK_TYPE_INVALID_CODE',
      )
    }
  }
}
