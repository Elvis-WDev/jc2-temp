import { createFileRoute } from '@tanstack/react-router'
import { EventForm } from '@/features/events/event-form'

export const Route = createFileRoute('/admin/events/new')({
  component: () => <EventForm />,
})
