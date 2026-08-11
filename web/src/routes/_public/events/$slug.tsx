import { createFileRoute } from '@tanstack/react-router'
import { SiteEventDetail } from '@/features/site/event-detail'

/** Ficha de un evento. Acepta identificador o slug, igual que la API. */
export const Route = createFileRoute('/_public/events/$slug')({
  component: SiteEventDetail,
})
