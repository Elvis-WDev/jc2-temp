/** Catalogo extensible de tipos de trabajo (ERS §14, RF-003). */

export interface WorkTypeRecord {
  id: string
  code: string
  label: string
  pluralLabel: string
  sortOrder: number
  /** Cuantos de este tipo salen en la portada. Vacio: sin limite propio. */
  maxItemsHome: number | null
  isActive: boolean
}

export interface WorkTypeCreateInput {
  code: string
  label: string
  pluralLabel: string
  sortOrder?: number
  maxItemsHome?: number | null
}

/** El `code` no aparece: es inmutable una vez creado. */
export interface WorkTypeUpdateInput {
  label?: string
  pluralLabel?: string
  sortOrder?: number
  maxItemsHome?: number | null
  isActive?: boolean
}

export interface WorkTypeRepository {
  list(activeOnly: boolean): Promise<WorkTypeRecord[]>
  findById(id: string): Promise<WorkTypeRecord | null>
  findByCode(code: string): Promise<WorkTypeRecord | null>
  create(input: WorkTypeCreateInput): Promise<WorkTypeRecord>
  update(id: string, input: WorkTypeUpdateInput): Promise<WorkTypeRecord>
  delete(id: string): Promise<void>
  countWorks(id: string): Promise<number>
}
