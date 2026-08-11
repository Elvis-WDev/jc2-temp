import { createFileRoute } from '@tanstack/react-router'
import { SiteResearchDetail } from '@/features/site/research-detail'

/** Ficha de un trabajo. Acepta identificador o slug, igual que la API. */
export const Route = createFileRoute('/_public/research/$slug')({
  component: SiteResearchDetail,
})
