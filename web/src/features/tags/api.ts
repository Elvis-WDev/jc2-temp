import {
  del,
  get,
  getWithMeta,
  patch,
  post,
  type PaginatedMeta,
} from '@/lib/api/client'

/**
 * Cliente del recurso `/api/admin/tags`.
 *
 * Los tipos se derivan a mano del contrato del backend. Se pueden generar desde
 * `/openapi.json` más adelante; mientras tanto, este archivo es el único sitio donde
 * la forma de la API entra en el frontend.
 */

export interface Tag {
  id: string
  name: string
  slug: string
  category: string | null
  sortOrder: number
  isActive: boolean
}

export interface TagListParams {
  page?: number
  page_size?: number
  q?: string
  category?: string
  active?: 'true' | 'false'
}

export interface TagCreateInput {
  name: string
  category?: string | null
  sortOrder?: number
}

export type TagUpdateInput = Partial<TagCreateInput> & { isActive?: boolean }

export async function listTags(
  params: TagListParams
): Promise<{ items: Tag[]; meta: PaginatedMeta }> {
  const { data, meta } = await getWithMeta<Tag[]>('/api/admin/tags', params)
  return { items: data, meta }
}

export function getTag(id: string): Promise<Tag> {
  return get<Tag>(`/api/admin/tags/${id}`)
}

/**
 * Categorias que ya se han usado. La categoria se escribe a mano al crear la etiqueta,
 * asi que el filtro no puede tener una lista fija: la saca de lo que existe.
 */
export function listTagCategories(): Promise<string[]> {
  return get<string[]>('/api/admin/tags/categories')
}

/**
 * Crear puede fallar con 409 `TAG_ALREADY_EXISTS` cuando el nombre colapsa al slug de
 * uno existente (RF-007). El error trae `fields.existingTagId`, que la interfaz usa
 * para ofrecer reutilizar el que ya hay en lugar de dejar al usuario atascado.
 */
export function createTag(input: TagCreateInput): Promise<Tag> {
  return post<Tag>('/api/admin/tags', input)
}

export function updateTag(id: string, input: TagUpdateInput): Promise<Tag> {
  return patch<Tag>(`/api/admin/tags/${id}`, input)
}

/**
 * Ocultar o volver a mostrar una etiqueta.
 *
 * Oculta deja de poder asignarse a trabajos nuevos, pero no se retira de los que ya la
 * llevan: para eso está eliminar.
 */
export function setTagActive(id: string, isActive: boolean): Promise<Tag> {
  return patch<Tag>(`/api/admin/tags/${id}`, { isActive })
}

/** `force` desreferencia y borra una etiqueta en uso; sin él, la API responde 409. */
export function deleteTag(id: string, force = false): Promise<void> {
  return del(`/api/admin/tags/${id}`, force ? { force: 'true' } : undefined)
}
