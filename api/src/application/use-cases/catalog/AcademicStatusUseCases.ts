import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  AcademicStatusInput,
  AcademicStatusRecord,
  AcademicStatusRepository,
} from '../../ports/repositories/AcademicStatusRepository.js'

/** Colores que sabe pintar el panel. */
const TONOS = ['success', 'warning', 'danger', 'info', 'neutral']

/**
 * Estados academicos (RF-004).
 *
 * Describen la madurez de un trabajo y no deciden nada sobre su visibilidad: de eso se
 * encarga el estado editorial, que sigue siendo una lista cerrada. Por eso este si
 * puede ampliarlo el titular.
 */
export class AcademicStatusUseCases {
  constructor(private readonly repo: AcademicStatusRepository) {}

  list(activeOnly: boolean): Promise<AcademicStatusRecord[]> {
    return this.repo.list(activeOnly)
  }

  async get(id: string): Promise<AcademicStatusRecord> {
    const estado = await this.repo.findById(id)
    if (estado === null) {
      throw new NotFoundError('The academic status does not exist.', 'ACADEMIC_STATUS_NOT_FOUND')
    }
    return estado
  }

  private assertTono(tone: string | undefined): void {
    if (tone !== undefined && !TONOS.includes(tone)) {
      throw new ConflictError(`Unknown colour "${tone}".`, 'ACADEMIC_STATUS_UNKNOWN_TONE')
    }
  }

  async create(input: AcademicStatusInput): Promise<AcademicStatusRecord> {
    this.assertTono(input.tone)
    const existente = await this.repo.findByCode(input.code)
    if (existente !== null) {
      throw new ConflictError(
        `The code "${input.code}" already exists.`,
        'ACADEMIC_STATUS_CODE_TAKEN',
      )
    }
    return this.repo.create(input)
  }

  async update(
    id: string,
    input: Partial<Omit<AcademicStatusInput, 'code'>> & { isActive?: boolean },
  ): Promise<AcademicStatusRecord> {
    await this.get(id)
    this.assertTono(input.tone)
    return this.repo.update(id, input)
  }

  /**
   * Un estado en uso no se borra: la clave foranea lo impediria de todos modos, pero
   * el mensaje de PostgreSQL no le dice nada util a quien lo intenta. Ocultarlo si.
   */
  async delete(id: string): Promise<void> {
    await this.get(id)
    const enUso = await this.repo.countWorks(id)
    if (enUso > 0) {
      throw new ConflictError(
        `The status is used by ${String(enUso)} works. Hide it instead of deleting it.`,
        'ACADEMIC_STATUS_IN_USE',
      )
    }
    await this.repo.delete(id)
  }
}
