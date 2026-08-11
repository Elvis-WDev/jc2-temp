import { createFileRoute } from '@tanstack/react-router'
import { EventForm } from '@/features/events/event-form'

export const Route = createFileRoute('/admin/events/$eventId')({
  // El componente va inline: exportar ademas una funcion desde el archivo de ruta
  // rompe el fast refresh de Vite.
  component: function EditarEvento() {
    const { eventId } = Route.useParams()
    return <EventForm eventId={eventId} />
  },
})
