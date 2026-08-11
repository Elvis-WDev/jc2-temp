import { createFileRoute } from '@tanstack/react-router'
import { SiteSettingsPage } from '@/features/site-settings'

export const Route = createFileRoute('/admin/site-settings/')({
  component: SiteSettingsPage,
})
