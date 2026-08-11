import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  CatalogRepository,
  CatalogTermInput,
  CatalogTermRecord,
} from '../../ports/repositories/CatalogRepository.js'

/**
 * Vocabularios editables: tipos de enlace, de archivo, de material de curso y de
 * vinculo de una afiliacion.
 *
 * Estos codigos se guardan como texto en las tablas que los usan, sin clave foranea.
 * Es deliberado —permite importar valores de otro sistema sin rechazarlos— pero
 * significa que la base de datos no impide borrar un termino en uso. Esa comprobacion
 * vive aqui.
 */
export class CatalogTermUseCases {
  constructor(private readonly repo: CatalogRepository) {}

  list(catalog: string | null, activeOnly: boolean): Promise<CatalogTermRecord[]> {
    return this.repo.list(catalog, activeOnly)
  }

  async get(id: string): Promise<CatalogTermRecord> {
    const termino = await this.repo.findById(id)
    if (termino === null) {
      throw new NotFoundError('The catalog term does not exist.', 'CATALOG_TERM_NOT_FOUND')
    }
    return termino
  }

  async create(input: CatalogTermInput): Promise<CatalogTermRecord> {
    const existente = await this.repo.findByCode(input.catalog, input.code)
    if (existente !== null) {
      throw new ConflictError(
        `The code "${input.code}" already exists in this catalog.`,
        'CATALOG_TERM_CODE_TAKEN',
      )
    }
    return this.repo.create(input)
  }

  async update(
    id: string,
    input: Partial<Omit<CatalogTermInput, 'catalog' | 'code'>>,
  ): Promise<CatalogTermRecord> {
    await this.get(id)
    return this.repo.update(id, input)
  }

  /**
   * Borrar un termino en uso deja esos registros con un valor que ya no figura en
   * ninguna lista: se siguen mostrando, pero el desplegable no lo ofrece y al editar
   * habria que elegir otro sin querer. Se bloquea y se ofrece ocultarlo, que es lo que
   * de verdad se suele querer.
   */
  async delete(id: string): Promise<void> {
    const termino = await this.get(id)
    const { total } = await this.repo.countUsage(termino.catalog, termino.code)

    if (total > 0) {
      throw new ConflictError(
        `The term is used by ${String(total)} records. Hide it instead of deleting it.`,
        'CATALOG_TERM_IN_USE',
      )
    }

    await this.repo.delete(id)
  }
}
