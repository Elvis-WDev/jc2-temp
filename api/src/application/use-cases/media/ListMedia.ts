import { mimesForKind, type MediaKind } from '../../../domain/media/MediaKind.js'
import type { PaginationQuery } from '../../../shared/http/pagination.js'
import { paginate, type Paginated } from '../../../shared/http/pagination.js'
import type { MediaAssetRecord, MediaRepository } from '../../ports/repositories/MediaRepository.js'

/** Lo que llega de la peticion, antes de traducirse a condiciones de busqueda. */
export interface ListMediaFilters {
  kind?: MediaKind | undefined
  visibility?: 'public' | 'private' | undefined
  q?: string | undefined
}

/** Listado paginado del gestor de archivos del panel. */
export class ListMedia {
  constructor(private readonly media: MediaRepository) {}

  async execute(
    query: PaginationQuery,
    filters: ListMediaFilters = {},
  ): Promise<Paginated<MediaAssetRecord>> {
    // La familia se traduce aqui, no en el repositorio: que un PDF sea un "documento"
    // es una regla del dominio, y la base de datos solo sabe de MIME.
    const { items, totalItems } = await this.media.list(query, {
      mimeTypes: filters.kind === undefined ? null : mimesForKind(filters.kind),
      isPublic: filters.visibility === undefined ? null : filters.visibility === 'public',
      search: filters.q === undefined || filters.q.trim() === '' ? null : filters.q.trim(),
    })
    return paginate(items, query, totalItems)
  }
}
