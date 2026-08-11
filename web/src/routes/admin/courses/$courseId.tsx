import { createFileRoute } from '@tanstack/react-router'
import { CourseForm } from '@/features/courses/course-form'

export const Route = createFileRoute('/admin/courses/$courseId')({
  // El componente va inline: exportar ademas una funcion desde el archivo de ruta
  // rompe el fast refresh de Vite.
  component: function EditarCurso() {
    const { courseId } = Route.useParams()
    return <CourseForm courseId={courseId} />
  },
})
