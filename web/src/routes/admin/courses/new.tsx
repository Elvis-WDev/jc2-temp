import { createFileRoute } from '@tanstack/react-router'
import { CourseForm } from '@/features/courses/course-form'

export const Route = createFileRoute('/admin/courses/new')({
  component: () => <CourseForm />,
})
