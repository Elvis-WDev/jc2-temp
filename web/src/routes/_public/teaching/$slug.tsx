import { createFileRoute } from '@tanstack/react-router'
import { SiteTeachingDetail } from '@/features/site/teaching-detail'

/** Ficha de un curso. Acepta identificador o slug, igual que la API. */
export const Route = createFileRoute('/_public/teaching/$slug')({
  component: SiteTeachingDetail,
})
