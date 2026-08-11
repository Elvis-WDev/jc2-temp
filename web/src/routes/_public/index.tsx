import { createFileRoute } from '@tanstack/react-router'
import { SiteHome } from '@/features/site/home'

/** La raiz del sitio. Antes era el panel; ahora el panel vive en `/admin`. */
export const Route = createFileRoute('/_public/')({
  component: SiteHome,
})
