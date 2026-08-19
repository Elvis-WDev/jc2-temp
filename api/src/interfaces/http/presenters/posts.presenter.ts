import type { PostRecord } from '../../../application/ports/repositories/PostRepository.js'
import { renderMarkdown } from '../../../shared/markdown/render.js'

/**
 * Capa 3 del blindaje: lista blanca explicita.
 *
 * Nunca sale `editorialStatus`, ni `displayOrder`, ni un identificador de archivo en
 * crudo: solo direcciones ya construidas. Y los adjuntos privados no se nombran siquiera,
 * porque enumerarlos ya dice que existen.
 */
function mediaUrl(baseUrl: string, mediaId: string | null): string | null {
  return mediaId === null ? null : `${baseUrl}/api/public/media/${mediaId}`
}

export function toPublicPostDto(
  post: PostRecord,
  baseUrl: string,
  kindLabels: Record<string, string> = {},
) {
  return {
    id: post.id,
    slug: post.slug,
    kind: post.kind,
    // El nombre del catalogo; el codigo crudo solo si nadie lo ha definido.
    kindLabel: kindLabels[post.kind] ?? post.kind,
    title: post.title,
    summary: post.summary,
    contentHtml: renderMarkdown(post.contentMarkdown),
    imageUrl: mediaUrl(baseUrl, post.imageMediaId),
    imageAlt: post.imageAlt,
    publishedAt: post.publishedAt === null ? null : post.publishedAt.toISOString(),
    files: post.files
      .filter((archivo) => archivo.isPublic)
      .map((archivo) => ({
        label: archivo.label,
        url: mediaUrl(baseUrl, archivo.mediaId) as string,
        // El tipo real, no el identificador: con el la ficha ofrece un reproductor para
        // lo que se puede escuchar y un enlace de descarga para lo demas.
        mimeType: archivo.mimeType,
      })),
  }
}

/** Lo que ve el panel: aqui si viaja el estado y los identificadores de archivo. */
export function toAdminPostDto(post: PostRecord) {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    contentMarkdown: post.contentMarkdown,
    imageMediaId: post.imageMediaId,
    imageAlt: post.imageAlt,
    editorialStatus: post.editorialStatus,
    publishedAt: post.publishedAt === null ? null : post.publishedAt.toISOString(),
    displayOrder: post.displayOrder,
    files: post.files,
  }
}
