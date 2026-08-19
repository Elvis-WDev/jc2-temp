import { createFileRoute } from '@tanstack/react-router'
import { SitePostDetail } from '@/features/site/post-detail'
import { BLOG } from '@/features/site/post-pages'

/** Ficha de una entrada. Acepta identificador o slug, igual que la API. */
export const Route = createFileRoute('/_public/blog/$slug')({
  component: () => <SitePostDetail pagina={BLOG} />,
})
