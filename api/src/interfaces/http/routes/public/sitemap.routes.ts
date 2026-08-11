import { Router } from 'express'
import type { GetSitemap } from '../../../../application/use-cases/public/GetSitemap.js'
import { registry } from '../../openapi/registry.js'

registry.registerPath({
  method: 'get',
  path: '/api/public/sitemap.xml',
  summary: 'Mapa del sitio, generado de lo publicado',
  description:
    'Se sirve tambien en /sitemap.xml, que es donde lo buscan los rastreadores. Publicar un trabajo lo anade y archivarlo lo quita, sin listas escritas a mano (ERS §39).',
  tags: ['Public / Site'],
  responses: { 200: { description: 'XML del sitemap.' } },
})

registry.registerPath({
  method: 'get',
  path: '/api/public/robots.txt',
  summary: 'Reglas para los rastreadores',
  description: 'Se sirve tambien en /robots.txt. Deja fuera el panel y apunta al sitemap.',
  tags: ['Public / Site'],
  responses: { 200: { description: 'Texto plano.' } },
})

export interface PublicSitemapRouterDeps {
  sitemap: GetSitemap
  publicBaseUrl: string
}

/** `&`, `<` y `'` dentro de una direccion romperian el XML. */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function createPublicSitemapRouter(deps: PublicSitemapRouterDeps): Router {
  const router = Router()

  router.get('/sitemap.xml', (_req, res, next) => {
    deps.sitemap
      .execute()
      .then((entradas) => {
        const urls = entradas
          .map(
            (entrada) =>
              `  <url>\n    <loc>${escaparXml(deps.publicBaseUrl + entrada.path)}</loc>\n    <priority>${entrada.priority}</priority>\n  </url>`,
          )
          .join('\n')

        res
          .type('application/xml')
          .send(
            `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
          )
      })
      .catch(next)
  })

  router.get('/robots.txt', (_req, res) => {
    // El panel no se indexa. No es una medida de seguridad —eso lo hace el guardian de
    // sesion— sino de higiene: sus direcciones no tienen por que salir en un buscador.
    res
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${deps.publicBaseUrl}/sitemap.xml\n`,
      )
  })

  return router
}
