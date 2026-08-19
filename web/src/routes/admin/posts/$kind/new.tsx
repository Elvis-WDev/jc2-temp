import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { kindDeSegmento } from '@/features/posts/kinds'
import { PostForm } from '@/features/posts/post-form'

export const Route = createFileRoute('/admin/posts/$kind/new')({
  // El componente va inline: exportar ademas una funcion desde el archivo de ruta
  // rompe el fast refresh de Vite.
  component: function NuevaEntrada() {
    const { kind } = Route.useParams()
    const tipo = kindDeSegmento(kind)
    if (tipo === null) {
      return (
        <Main>
          <EmptyState
            variant='no-results'
            title='Unknown section'
            description='Only News and Blog have a screen of their own.'
          />
        </Main>
      )
    }
    return <PostForm tipo={tipo} />
  },
})
