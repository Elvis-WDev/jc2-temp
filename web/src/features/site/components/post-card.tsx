import { Link } from '@tanstack/react-router'
import { CalendarDays, ImageIcon } from 'lucide-react'
import { type PublicPost } from '../api'
import { fechaLarga } from '../post-format'
import { type PaginaDeEntradas } from '../post-pages'

/**
 * Una entrada en el listado.
 *
 * Mismo lenguaje que las tarjetas de Research y de Eventos: el filete que sube al pasar
 * por encima, la linea de metadatos y las mismas tipografias.
 *
 * Dos formas segun donde se pinte. A lo ancho, la imagen va al lado y sin ella la
 * tarjeta ocupa la fila entera en vez de dejar un hueco. En rejilla, la imagen encabeza
 * la tarjeta como portada; ahi el hueco **si** se reserva, con un marcador, porque en
 * dos columnas unas tarjetas con foto y otras sin ella dejarian los titulos a distinta
 * altura y la rejilla se leeria torcida.
 */
export function PostCard({
  post,
  pagina,
  variante = 'ancha',
}: {
  post: PublicPost
  pagina: PaginaDeEntradas
  variante?: 'ancha' | 'rejilla'
}) {
  if (variante === 'rejilla')
    return <TarjetaConPortada post={post} pagina={pagina} />

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

function TarjetaConPortada({
  post,
  pagina,
}: {
  post: PublicPost
  pagina: PaginaDeEntradas
}) {
  return (
    <article className='group relative flex h-full flex-col overflow-hidden border border-site-primary-container/10 bg-site-surface-bright transition-shadow hover:shadow-sm'>
      <div
        aria-hidden
        className='absolute top-0 bottom-0 left-0 z-10 w-1 origin-top scale-y-0 bg-site-primary-container transition-transform duration-300 ease-out group-hover:scale-y-100'
      />

      {post.imageUrl === null ? (
        // El hueco se reserva para que los titulos de la fila queden a la misma altura.
        // Se marca con el icono en lugar de dejarlo en blanco: un rectangulo vacio
        // parece una imagen que no ha cargado.
        <div className='flex aspect-[16/9] w-full items-center justify-center bg-site-surface-container'>
          <ImageIcon
            aria-hidden
            className='size-8 text-site-on-surface-variant/30'
          />
        </div>
      ) : (
        <img
          src={post.imageUrl}
          alt={post.imageAlt ?? ''}
          className='aspect-[16/9] w-full object-cover'
        />
      )}

      <div className='flex flex-1 flex-col p-6'>
        {post.publishedAt !== null && (
          <span className='flex items-center gap-1.5 text-site-meta text-site-on-surface-variant'>
            <CalendarDays aria-hidden className='size-4' />
            {fechaLarga(post.publishedAt)}
          </span>
        )}

        <h2 className='mt-2 font-site-display text-site-headline-sm text-balance text-site-on-surface'>
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
    </article>
  )
}
