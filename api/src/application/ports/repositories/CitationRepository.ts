/** Estilos de cita y las citas escritas a mano para cada trabajo. */

export interface CitationStyleRecord {
  id: string
  code: string
  name: string
  /** Extension al descargar la cita (.bib, .ris). Vacia si es texto plano. */
  extension: string | null
  sortOrder: number
  isActive: boolean
}

export interface CitationStyleInput {
  code: string
  name: string
  extension?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface WorkCitationRecord {
  id: string
  workId: string
  citationStyleId: string
  styleCode: string
  styleName: string
  content: string
}

export interface CitationRepository {
  listStyles(activeOnly: boolean): Promise<CitationStyleRecord[]>
  findStyleById(id: string): Promise<CitationStyleRecord | null>
  findStyleByCode(code: string): Promise<CitationStyleRecord | null>
  createStyle(input: CitationStyleInput): Promise<CitationStyleRecord>
  updateStyle(
    id: string,
    input: Partial<Omit<CitationStyleInput, 'code'>>,
  ): Promise<CitationStyleRecord>
  deleteStyle(id: string): Promise<void>
  countCitationsByStyle(styleId: string): Promise<number>

  listByWork(workId: string): Promise<WorkCitationRecord[]>
  /** Crea o reemplaza la cita de ese trabajo en ese estilo. */
  upsert(workId: string, citationStyleId: string, content: string): Promise<WorkCitationRecord>
  remove(workId: string, citationStyleId: string): Promise<void>
}
