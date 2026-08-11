/** Estados academicos (ERS RF-004), ahora catalogo editable en vez de enum. */

export interface AcademicStatusRecord {
  id: string
  code: string
  label: string
  /** Color en las tablas: success, warning, danger, info o neutral. */
  tone: string
  sortOrder: number
  isActive: boolean
}

export interface AcademicStatusInput {
  code: string
  label: string
  tone?: string
  sortOrder?: number
}

export interface AcademicStatusRepository {
  list(activeOnly: boolean): Promise<AcademicStatusRecord[]>
  findById(id: string): Promise<AcademicStatusRecord | null>
  findByCode(code: string): Promise<AcademicStatusRecord | null>
  create(input: AcademicStatusInput): Promise<AcademicStatusRecord>
  /** El `code` no se toca: viaja en la URL publica `?status=` y en lo ya guardado. */
  update(
    id: string,
    input: Partial<Omit<AcademicStatusInput, 'code'>> & { isActive?: boolean },
  ): Promise<AcademicStatusRecord>
  delete(id: string): Promise<void>
  countWorks(id: string): Promise<number>
}
