import { createFileRoute } from '@tanstack/react-router'
import { SiteNotFound } from '@/features/site/not-found'

/**
 * Cualquier direccion del sitio que no case con ninguna otra.
 *
 * Cuelga de `_public` a proposito: asi la pantalla sale **dentro** del sitio, con su
 * cabecera y su pie.
 *
 * `_public` no tiene ruta propia, asi que este comodin casa **tambien** con
 * `/admin/lo-que-sea`. Por eso el panel lleva el suyo en `routes/admin/$.tsx`: sin el,
 * equivocarse de direccion dentro del panel sacaba esta pantalla. Lo comprobo el barrido,
 * no yo: el comentario que habia aqui aseguraba lo contrario.
 */
export const Route = createFileRoute('/_public/$')({
  component: SiteNotFound,
})
