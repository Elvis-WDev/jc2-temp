import { createFileRoute } from '@tanstack/react-router'
import { WorkForm } from '@/features/works/work-form'

export const Route = createFileRoute('/admin/works/new')({
  component: () => <WorkForm />,
})
