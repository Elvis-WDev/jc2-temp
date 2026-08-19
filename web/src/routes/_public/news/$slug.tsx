import { createFileRoute } from '@tanstack/react-router'
import { SitePostDetail } from '@/features/site/post-detail'
import { NOTICIAS } from '@/features/site/post-pages'

/** Ficha de una entrada. Acepta identificador o slug, igual que la API. */
export const Route = createFileRoute('/_public/news/$slug')({
  component: () => <SitePostDetail pagina={NOTICIAS} />,
})
