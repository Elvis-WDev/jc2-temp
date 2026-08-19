import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { kindDeSegmento } from '@/features/posts/kinds'
import { PostForm } from '@/features/posts/post-form'

export const Route = createFileRoute('/admin/posts/$kind/$postId')({
  component: function EditarEntrada() {
    const { kind, postId } = Route.useParams()
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
    return <PostForm tipo={tipo} postId={postId} />
  },
})
