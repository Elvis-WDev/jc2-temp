import { Router } from 'express'
import type { PostUseCases } from '../../../../application/use-cases/posts/PostUseCases.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import { PAGINA_POR_TIPO_DE_POST } from '../../../../domain/posts/kinds.js'
import { NotFoundError } from '../../../../shared/errors/AppError.js'
import { validate, validated } from '../../middlewares/validate.js'
import { toPublicPostDto } from '../../presenters/posts.presenter.js'
import { postRefParamsSchema, publicPostQuerySchema } from '../../schemas/posts.schemas.js'
import { jsonHandler, paginatedHandler } from '../../support/handler.js'

/**
 * Noticias y blog para la web.
 *
 * Un solo par de rutas para las dos formas: lo que las separa es `?kind=`. Por eso el
 * interruptor de pagina no se puede montar como middleware fijo —una ruta, dos
 * paginas—: se comprueba dentro, con el tipo ya validado.
 *
 * Solo el listado se corta, no la ficha, igual que en el resto del sitio: ocultar la
 * seccion la quita del menu y del indice, pero un enlace que ya circula se sigue
 * abriendo (RN-010).
 */
export interface PublicPostsRouterDeps {
  posts: PostUseCases
  siteContent: SiteContentUseCases
  publicBaseUrl: string
}

export function createPublicPostsRouter(deps: PublicPostsRouterDeps): Router {
  const router = Router()

  router.get(
    '/',
    validate({ query: publicPostQuerySchema }),
    paginatedHandler(async (req) => {
      const { query } = validated<unknown, { page: number; page_size: number; kind?: string }>(req)

      // Sin `kind` no hay pagina que consultar: el listado es generico y no lo usa la
      // web, que siempre pide uno de los dos.
      if (query.kind !== undefined) {
        const clave = PAGINA_POR_TIPO_DE_POST[query.kind]
        const visible = clave === undefined ? null : await deps.siteContent.findPublishedPage(clave)
        if (clave !== undefined && visible === null) {
          throw new NotFoundError('This section is not available.', 'PAGE_NOT_AVAILABLE')
        }
      }

      const pagina = await deps.posts.listPublished(
        { page: query.page, page_size: query.page_size },
        { kind: query.kind ?? null },
      )
      return {
        ...pagina,
        items: pagina.items.map((post) =>
          toPublicPostDto(post, deps.publicBaseUrl, pagina.kindLabels),
        ),
      }
    }),
  )

  router.get(
    '/:idOrSlug',
    validate({ params: postRefParamsSchema }),
    jsonHandler(async (req) => {
      const { params } = validated<{ idOrSlug: string }>(req)
      const detalle = await deps.posts.getPublished(params.idOrSlug)
      return toPublicPostDto(detalle.post, deps.publicBaseUrl, detalle.kindLabels)
    }),
  )

  return router
}
