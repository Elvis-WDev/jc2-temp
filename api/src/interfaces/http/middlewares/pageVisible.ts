import type { RequestHandler } from 'express'
import type { SiteContentUseCases } from '../../../application/use-cases/site/SiteContentUseCases.js'
import type { PageKey } from '../../../application/ports/repositories/SiteContentRepository.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'

/**
 * Corta el listado de una pagina que el titular ha ocultado.
 *
 * Se monta SOLO sobre el listado, no sobre las fichas. Ocultar una seccion quita su
 * indice del menu, del listado y del sitemap, pero `/research/un-paper` se sigue
 * abriendo: un DOI impreso o un correo enviado hace dos anos no pueden romperse porque
 * este ano se decida no ensenar el archivo completo (RN-010).
 *
 * Responde 404, no 403: que la pagina exista pero este oculta no es asunto del
 * visitante, igual que con un borrador.
 */
export function requirePageVisible(
  siteContent: SiteContentUseCases,
  pageKey: PageKey,
): RequestHandler {
  return (_req, _res, next) => {
    siteContent
      .findPublishedPage(pageKey)
      .then((pagina) => {
        if (pagina === null) {
          next(new NotFoundError('This section is not available.', 'PAGE_NOT_AVAILABLE'))
          return
        }
        next()
      })
      .catch(next)
  }
}
