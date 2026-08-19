import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/**
 * Cliente de `/api/admin/posts`.
 *
 * Noticias y entradas de blog: una sola tabla, distinguidas por `kind`. Se rigen por el
 * mismo estado editorial que trabajos, cursos y eventos: la web solo ve los publicados.
 */

export type EditorialStatus = 'draft' | 'published' | 'archived'

export interface PostFile {
  mediaId: string
  label: string | null
  sortOrder: number
  /** Un adjunto privado no se nombra siquiera en la web. */
  isPublic: boolean
}

export interface PostItem {
  id: string
  kind: string
  title: string
  slug: string
  summary: string | null
  contentMarkdown: string | null
  imageMediaId: string | null
  imageAlt: string | null
  editorialStatus: EditorialStatus
  publishedAt: string | null
  /** Fija la entrada arriba del listado. Vacio: orden cronologico. */
  displayOrder: number | null
  files: PostFile[]
}

export interface PostListParams {
  page?: number
  page_size?: number
  q?: string
  kind?: string
  status?: EditorialStatus
}

export interface PostWriteInput {
  kind: string
  title: string
  slug?: string
  summary?: string | null
  contentMarkdown?: string | null
  imageMediaId?: string | null
  imageAlt?: string | null
  displayOrder?: number | null
  files?: PostFile[]
}

export async function listPosts(
  params: PostListParams
): Promise<{ items: PostItem[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<PostItem[]>(
    '/api/admin/posts',
    params
  )
  return { items: data, meta }
}

export function getPost(id: string): Promise<PostItem> {
  return get<PostItem>(`/api/admin/posts/${id}`)
}

export function createPost(input: PostWriteInput): Promise<PostItem> {
  return post<PostItem>('/api/admin/posts', input)
}

export function updatePost(
  id: string,
  input: Partial<PostWriteInput>
): Promise<PostItem> {
  return patch<PostItem>(`/api/admin/posts/${id}`, input)
}

export function deletePost(id: string): Promise<void> {
  return del(`/api/admin/posts/${id}`)
}

export function publishPost(id: string): Promise<PostItem> {
  return post<PostItem>(`/api/admin/posts/${id}/publish`)
}

export function archivePost(id: string): Promise<PostItem> {
  return post<PostItem>(`/api/admin/posts/${id}/archive`)
}
