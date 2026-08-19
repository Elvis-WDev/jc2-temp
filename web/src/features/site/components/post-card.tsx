import { Link } from '@tanstack/react-router'
import { CalendarDays } from 'lucide-react'
import { type PublicPost } from '../api'
import { fechaLarga } from '../post-format'
import { type PaginaDeEntradas } from '../post-pages'

/**
 * Una entrada en el listado.
 *
 * Mismo lenguaje que las tarjetas de Research y de Eventos: el filete que sube al pasar
 * por encima, la linea de metadatos y las mismas tipografias. La imagen va a la
 * izquierda cuando la hay, y cuando no la tarjeta ocupa el ancho entero en lugar de
 * dejar un hueco donde deberia estar.
 */
export function PostCard({
  post,
  pagina,
}: {
  post: PublicPost
  pagina: PaginaDeEntradas
}) {
  return (
    <article className='group relative overflow-hidden border border-site-primary-container/10 bg-site-surface-bright transition-shadow hover:shadow-sm'>
      <div
        aria-hidden
        className='absolute top-0 bottom-0 left-0 z-10 w-1 origin-top scale-y-0 bg-site-primary-container transition-transform duration-300 ease-out group-hover:scale-y-100'
      />

      <div className='flex flex-col gap-6 sm:flex-row'>
        {post.imageUrl !== null && (
          <img
            src={post.imageUrl}
            alt={post.imageAlt ?? ''}
            className='h-48 w-full object-cover sm:h-auto sm:w-56 sm:shrink-0'
          />
        )}

        <div className='flex-1 p-6'>
          {post.publishedAt !== null && (
            <span className='flex items-center gap-1.5 text-site-meta text-site-on-surface-variant'>
              <CalendarDays aria-hidden className='size-4' />
              {fechaLarga(post.publishedAt)}
            </span>
          )}

          <h2 className='mt-2 font-site-display text-site-headline-sm text-site-on-surface'>
            <Link
              to={pagina.rutaDeFicha}
              params={{ slug: post.slug }}
              className='transition-colors hover:text-site-primary'
            >
              {post.title}
            </Link>
          </h2>

          {post.summary !== null && (
            <p className='mt-2 text-site-on-surface-variant'>{post.summary}</p>
          )}
        </div>
      </div>
    </article>
  )
}
