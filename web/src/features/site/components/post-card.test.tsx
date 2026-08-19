import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { type PublicPost } from '../api'
import { BLOG } from '../post-pages'
import { PostCard } from './post-card'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const ENTRADA: PublicPost = {
  id: 'p1',
  slug: 'una-entrada',
  kind: 'personal',
  kindLabel: 'Blog',
  title: 'Notas de un semestre',
  summary: 'Lo que cambio al reescribir el curso.',
  contentHtml: null,
  imageUrl: null,
  imageAlt: null,
  publishedAt: '2026-07-22T00:00:00.000Z',
  files: [],
}

/**
 * Si la tarjeta reserva el hueco de portada.
 *
 * Por la clase de proporcion y no por el elemento: el hueco lo ocupa la imagen cuando la
 * hay y un marcador cuando no, y lo que importa es que el sitio este reservado en los dos
 * casos. Buscar un `img` daria falso negativo justo en el caso interesante.
 */
const reservaPortada = () =>
  document.querySelector('article')?.innerHTML.includes('aspect-[16/9]') ??
  false

describe('la tarjeta de una entrada', () => {
  it('en rejilla reserva el hueco de la portada aunque no haya imagen', async () => {
    // En dos columnas, unas tarjetas con foto y otras sin ella dejarian los titulos a
    // distinta altura y la rejilla se leeria torcida.
    const screen = await render(
      <PostCard post={ENTRADA} pagina={BLOG} variante='rejilla' />
    )
    await expect.element(screen.getByText('Notas de un semestre')).toBeVisible()

    expect(reservaPortada()).toBe(true)
  })

  it('en rejilla la portada encabeza la tarjeta', async () => {
    const screen = await render(
      <PostCard
        post={{
          ...ENTRADA,
          imageUrl: '/api/public/media/x',
          imageAlt: 'La pizarra',
        }}
        pagina={BLOG}
        variante='rejilla'
      />
    )

    const imagen = screen.getByAltText('La pizarra')
    await expect.element(imagen).toBeVisible()
    // Antes del titulo en el orden del documento: es la portada, no una ilustracion
    // suelta al final.
    const articulo = document.querySelector('article')
    const posicion = [...(articulo?.querySelectorAll('img, h2') ?? [])].map(
      (nodo) => nodo.tagName
    )

    expect(posicion).toEqual(['IMG', 'H2'])
  })

  it('a lo ancho sin imagen no deja ningun hueco', async () => {
    // Ahi la tarjeta ocupa la fila entera: reservar sitio para una foto que no existe
    // solo dejaria un rectangulo vacio.
    const screen = await render(<PostCard post={ENTRADA} pagina={BLOG} />)
    await expect.element(screen.getByText('Notas de un semestre')).toBeVisible()

    expect(reservaPortada()).toBe(false)
  })
})
