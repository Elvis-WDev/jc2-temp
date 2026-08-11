import { createFileRoute } from '@tanstack/react-router'
import { SiteLayout } from '@/features/site/site-layout'

/**
 * Layout del sitio publico. Sin ruta propia (`_public` no aparece en la direccion),
 * asi que sus hijos cuelgan de la raiz: `/`, y en sus fases `/research` y `/teaching`.
 *
 * Aqui NO hay `beforeLoad`. Es lo que lo distingue de `/admin`: cualquiera entra.
 */
export const Route = createFileRoute('/_public')({
  component: SiteLayout,
})
