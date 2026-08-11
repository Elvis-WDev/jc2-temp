import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  CitationRepository,
  CitationStyleInput,
  CitationStyleRecord,
  WorkCitationRecord,
} from '../../ports/repositories/CitationRepository.js'

/**
 * Estilos de cita y las citas escritas a mano.
 *
 * El BibTeX que genera el sistema sigue como estaba: esto es para cuando la editorial
 * publica una forma de citar concreta y se quiere ofrecer tal cual, en APA, Chicago o
 * lo que haga falta.
 */
export class CitationUseCases {
  constructor(private readonly repo: CitationRepository) {}

  listStyles(activeOnly: boolean): Promise<CitationStyleRecord[]> {
    return this.repo.listStyles(activeOnly)
  }

  async getStyle(id: string): Promise<CitationStyleRecord> {
    const estilo = await this.repo.findStyleById(id)
    if (estilo === null) {
      throw new NotFoundError('The citation style does not exist.', 'CITATION_STYLE_NOT_FOUND')
    }
    return estilo
  }

  async createStyle(input: CitationStyleInput): Promise<CitationStyleRecord> {
    const existente = await this.repo.findStyleByCode(input.code)
    if (existente !== null) {
      throw new ConflictError(
        `The code "${input.code}" already exists.`,
        'CITATION_STYLE_CODE_TAKEN',
      )
    }
    return this.repo.createStyle(input)
  }

  async updateStyle(
    id: string,
    input: Partial<Omit<CitationStyleInput, 'code'>>,
  ): Promise<CitationStyleRecord> {
    await this.getStyle(id)
    return this.repo.updateStyle(id, input)
  }

  /** Un estilo con citas escritas no se borra: se ocultaria, y esas citas se perderian. */
  async deleteStyle(id: string): Promise<void> {
    await this.getStyle(id)
    const enUso = await this.repo.countCitationsByStyle(id)
    if (enUso > 0) {
      throw new ConflictError(
        `The style is used by ${String(enUso)} citations. Hide it instead of deleting it.`,
        'CITATION_STYLE_IN_USE',
      )
    }
    await this.repo.deleteStyle(id)
  }

  listByWork(workId: string): Promise<WorkCitationRecord[]> {
    return this.repo.listByWork(workId)
  }

  async save(
    workId: string,
    citationStyleId: string,
    content: string,
  ): Promise<WorkCitationRecord> {
    // Que el estilo exista se comprueba antes: si no, la clave foranea daria un mensaje
    // que no le dice nada a quien escribe la cita.
    await this.getStyle(citationStyleId)
    return this.repo.upsert(workId, citationStyleId, content)
  }

  remove(workId: string, citationStyleId: string): Promise<void> {
    return this.repo.remove(workId, citationStyleId)
  }
}
