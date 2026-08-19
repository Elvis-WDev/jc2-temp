import type { PaginationQuery } from '../../../shared/http/pagination.js'

/**
 * Noticias y entradas de blog.
 *
 * Una sola entidad para las dos formas (ERS RF-002 aplicado a los posts): lo que cambia
 * entre una noticia y una entrada es el tono y los campos que se rellenan, no la
 * estructura. `kind` sale del catalogo `post_kind`.
 */

export interface PostFileRecord {
  mediaId: string
  label: string | null
  sortOrder: number
  isPublic: boolean
}

/** Un adjunto tal como sale de la base: con el tipo real del archivo que apunta. */
export interface PostFileWithType extends PostFileRecord {
  /** El MIME detectado al subirlo. Es lo que decide si la ficha ofrece reproducirlo. */
  mimeType: string
}

export interface PostRecord {
  id: string
  kind: string
  title: string
  slug: string
  summary: string | null
  contentMarkdown: string | null
  imageMediaId: string | null
  imageAlt: string | null
  editorialStatus: string
  publishedAt: Date | null
  displayOrder: number | null
  files: PostFileWithType[]
}

export interface PostWriteInput {
  kind: string
  title: string
  slug: string
  summary?: string | null
  contentMarkdown?: string | null
  imageMediaId?: string | null
  imageAlt?: string | null
  displayOrder?: number | null
  files?: PostFileRecord[]
}

export interface PostListFilters {
  search: string | null
  kind: string | null
  editorialStatus: string | null
}

export interface PostRepository {
  list(
    query: PaginationQuery,
    filters: PostListFilters,
  ): Promise<{ items: PostRecord[]; totalItems: number }>
  findById(id: string): Promise<PostRecord | null>
  slugExists(slug: string, exceptId?: string): Promise<boolean>
  create(input: PostWriteInput, actorId: string | null): Promise<PostRecord>
  update(id: string, input: Partial<PostWriteInput>, actorId: string | null): Promise<PostRecord>
  delete(id: string): Promise<void>
  setEditorialStatus(id: string, status: string, publishedAt: Date | null): Promise<PostRecord>

  /** Solo publicados, para la web (RN-001). */
  listPublished(
    query: PaginationQuery,
    filters: { kind: string | null },
  ): Promise<{ items: PostRecord[]; totalItems: number }>
  findPublished(idOrSlug: string): Promise<PostRecord | null>
  /** Los publicados, para el sitemap. */
  listPublishedSlugs(): Promise<Array<{ kind: string; slug: string; publishedAt: Date | null }>>
}
