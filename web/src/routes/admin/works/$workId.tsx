import { createFileRoute } from '@tanstack/react-router'
import { WorkForm } from '@/features/works/work-form'

export const Route = createFileRoute('/admin/works/$workId')({
  // El componente va inline: exportar ademas una funcion desde el archivo de ruta
  // rompe el fast refresh de Vite.
  component: function EditarTrabajo() {
    const { workId } = Route.useParams()
    return <WorkForm workId={workId} />
  },
})
