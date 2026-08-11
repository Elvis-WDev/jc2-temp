import { z } from 'zod'

/**
 * Contrato unico de paginacion (ERS §47). Ningun listado lo reimplementa.
 */

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  pagination: Pagination
}

/** Convierte pagina/tamano en el `skip`/`take` que espera Prisma. */
export function toSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.page_size, take: query.page_size }
}

export function buildPagination(query: PaginationQuery, totalItems: number): Pagination {
  return {
    page: query.page,
    pageSize: query.page_size,
    totalItems,
    // Una coleccion vacia tiene 0 paginas, no 1: el cliente distingue "sin datos".
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.page_size),
  }
}

export function paginate<T>(items: T[], query: PaginationQuery, totalItems: number): Paginated<T> {
  return { items, pagination: buildPagination(query, totalItems) }
}
