import { createFileRoute } from '@tanstack/react-router'
import { NotFoundError } from '@/features/errors/not-found-error'

/**
 * Cualquier direccion del panel que no case con ninguna otra.
 *
 * Hace falta explicitamente. El comodin del sitio publico cuelga de `_public`, que no
 * tiene ruta propia, asi que casa tambien con `/admin/lo-que-sea`: sin esto, equivocarse
 * de direccion dentro del panel sacaba la pantalla del sitio, con su cabecera y su pie.
 * Al ser `/admin` un prefijo mas concreto, este gana.
 */
export const Route = createFileRoute('/admin/$')({
  component: NotFoundError,
})
