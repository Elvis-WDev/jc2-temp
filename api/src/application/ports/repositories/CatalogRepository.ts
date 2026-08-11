/** Vocabularios editables desde el panel (tipos de enlace, de archivo, de material...). */

export interface CatalogTermRecord {
  id: string
  catalog: string
  code: string
  label: string
  /** Explicacion opcional. La web la usa como entradilla de cada grupo. */
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CatalogTermInput {
  catalog: string
  code: string
  label: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

/** Cuantas filas usan un termino. Sirve para avisar antes de borrarlo. */
export interface CatalogTermUsage {
  total: number
}

export interface CatalogRepository {
  list(catalog: string | null, activeOnly: boolean): Promise<CatalogTermRecord[]>
  findById(id: string): Promise<CatalogTermRecord | null>
  findByCode(catalog: string, code: string): Promise<CatalogTermRecord | null>
  create(input: CatalogTermInput): Promise<CatalogTermRecord>
  /** El `code` no se toca al editar: es lo que hay guardado en las filas existentes. */
  update(
    id: string,
    input: Partial<Omit<CatalogTermInput, 'catalog' | 'code'>>,
  ): Promise<CatalogTermRecord>
  delete(id: string): Promise<void>

  /**
   * Cuenta las filas que ya usan este codigo.
   *
   * No hay clave foranea, asi que la base de datos no lo impide por su cuenta: se
   * cuenta aqui para poder avisar de que borrarlo dejaria esos registros con un valor
   * que ya no figura en ninguna lista.
   */
  countUsage(catalog: string, code: string): Promise<CatalogTermUsage>
}
