import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Cabeceras de cache para contenido publico (PERF-004).
 *
 * El ETag no se calcula aqui: Express ya lo genera en `res.json()` y responde 304
 * cuando el `If-None-Match` del cliente coincide. Lo que faltaba era decirle a la
 * cache cuanto puede reutilizar la respuesta.
 *
 * `must-revalidate` es deliberado: al publicar un trabajo debe aparecer sin esperar a
 * que expire nada, y con revalidacion el 304 sigue siendo barato.
 *
 * OJO con el numero. `must-revalidate` no evita que el navegador sirva de su cache
 * mientras la respuesta siga fresca: solo le obliga a preguntar cuando ya esta vencida.
 * Con cinco minutos, apagar una seccion en el panel parecia no hacer nada durante cinco
 * minutos, que es exactamente la clase de fallo que este proyecto lleva corrigiendo.
 * Un minuto sigue absorbiendo una punta de visitas y no hace dudar de si el interruptor
 * funciona.
 */
export function publicCache(maxAgeSeconds: number): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, must-revalidate`)
      // La respuesta depende del Origin cuando hay CORS con credenciales.
      res.setHeader('Vary', 'Accept-Encoding, Origin')
    }
    next()
  }
}
