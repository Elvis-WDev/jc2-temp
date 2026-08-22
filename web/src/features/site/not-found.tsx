import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useSiteMeta } from './use-site-meta'

/**
 * Una direccion del sitio que no existe.
 *
 * Antes salia la pantalla del panel —la del «404» enorme en indigo, con su boton «Back to
 * Home»— sin cabecera, sin pie y sin la tipografia del sitio: quien se equivocaba de
 * direccion aterrizaba en una pagina que no parecia de aqui. Esta se parece a las de «no
 * publicado» que ya habia, que estaban bien resueltas.
 *
 * **Responde 200 y no 404**, y eso no tiene arreglo completo desde aqui: en una aplicacion
 * de una sola pagina el servidor entrega el mismo `index.html` para cualquier direccion y
 * quien decide que no existe es el navegador, cuando el codigo de estado ya se ha enviado.
 * Lo que si evita que un buscador la indexe es `noindex`, y eso es lo que se pone. Salir
 * de ahi pediria renderizar en el servidor, que es otra conversacion.
 */
export function SiteNotFound() {
  useSiteMeta({
    title: 'Page not found',
    description: null,
    path: window.location.pathname,
    imageUrl: null,
    // Lo que de verdad la mantiene fuera del buscador, ya que el 200 no se puede evitar.
    extraMeta: [{ name: 'robots', content: 'noindex' }],
  })

  return (
    <section className='mx-auto max-w-site px-site-margin py-site-section lg:px-site-gutter'>
      <h1 className='font-site-display text-site-headline-md text-site-primary'>
        This page does not exist.
      </h1>
      <p className='text-site-body mt-4 max-w-prose leading-relaxed'>
        The address may be mistyped, or the page may have been removed.
      </p>
      <Link
        to='/'
        className='mt-6 inline-flex items-center gap-2 text-site-label text-site-primary uppercase'
      >
        <ArrowLeft aria-hidden className='size-4' />
        Back to the home page
      </Link>
    </section>
  )
}
