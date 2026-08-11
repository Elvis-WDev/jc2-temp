import type { PaginationQuery } from '../../../shared/http/pagination.js'

/** Taxonomia unificada de works y courses (ERS §17, RF-007). */

export interface TagRecord {
  id: string
  name: string
  slug: string
  category: string | null
  sortOrder: number
  isActive: boolean
}

export interface TagInput {
  name: string
  slug: string
  category?: string | null
  sortOrder?: number
  isActive?: boolean
}

export interface TagUsage {
  works: number
  courses: number
  total: number
}

export interface TagRepository {
  list(
    query: PaginationQuery,
    filters: { search: string | null; category: string | null; active: boolean | null },
  ): Promise<{ items: TagRecord[]; totalItems: number }>
  /** Categorias distintas que hay en uso, ordenadas. Se escriben a mano al crear tags. */
  listCategories(): Promise<string[]>
  findById(id: string): Promise<TagRecord | null>
  /** Clave de la deduplicacion de RF-007: el slug es lo que identifica un tag. */
  findBySlug(slug: string): Promise<TagRecord | null>
  create(input: TagInput): Promise<TagRecord>
  update(id: string, input: Partial<TagInput>): Promise<TagRecord>
  delete(id: string): Promise<void>
  countUsage(id: string): Promise<TagUsage>
}
