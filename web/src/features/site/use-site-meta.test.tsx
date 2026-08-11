import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { resumirHtml, titulo, useSiteIcon } from './use-site-meta'

describe('resumen para la meta descripcion', () => {
  it('quita las etiquetas y deja el texto', () => {
    expect(resumirHtml('<p>Este trabajo estudia <em>mercados</em>.</p>')).toBe(
      'Este trabajo estudia mercados.'
    )
  })

  it('junta los saltos de linea en espacios', () => {
    // Un resumen con parrafos no puede llegar a la meta con saltos dentro.
    expect(resumirHtml('<p>Primero.</p>\n<p>Segundo.</p>')).toBe(
      'Primero. Segundo.'
    )
  })

  it('recorta lo largo con puntos suspensivos', () => {
    const largo = resumirHtml(`<p>${'a'.repeat(400)}</p>`)

    expect(largo).toHaveLength(200)
    expect(largo?.endsWith('…')).toBe(true)
  })

  it('sin contenido devuelve vacio, no una cadena en blanco', () => {
    expect(resumirHtml(null)).toBeNull()
    expect(resumirHtml('<p>   </p>')).toBeNull()
  })
})

describe('titulo de la pestana', () => {
  it('acompana la seccion con el nombre del sitio', () => {
    expect(titulo('Research', 'Juan Castro')).toBe('Research · Juan Castro')
  })

  it('mientras no se conoce el nombre, solo la seccion', () => {
    // Es lo que se ve el primer instante, antes de que responda /api/public/site.
    expect(titulo('Research', undefined)).toBe('Research')
  })
})

describe('el emblema como favicon', () => {
  const ESTATICOS = [
    { href: '/images/favicon.svg', media: '(prefers-color-scheme: light)' },
    {
      href: '/images/favicon_light.svg',
      media: '(prefers-color-scheme: dark)',
    },
  ]

  function ponerEstaticos() {
    for (const { href, media } of ESTATICOS) {
      const enlace = document.createElement('link')
      enlace.rel = 'icon'
      enlace.href = href
      enlace.media = media
      enlace.dataset.prueba = ''
      document.head.appendChild(enlace)
    }
  }

  function iconos() {
    return [...document.head.querySelectorAll('link[rel~="icon"]')]
  }

  afterEach(() => {
    for (const icono of iconos()) icono.remove()
  })

  function Pantalla({ url }: { url: string | null }) {
    useSiteIcon(url)
    return null
  }

  it('sustituye a los del index.html en vez de sumarse a ellos', async () => {
    ponerEstaticos()
    await render(<Pantalla url='https://ejemplo.test/api/public/media/abc' />)

    // Con varios declarados el navegador elige, y podria no elegir el del titular.
    expect(iconos()).toHaveLength(1)
    expect(iconos()[0].getAttribute('href')).toBe(
      'https://ejemplo.test/api/public/media/abc'
    )
  })

  it('sin emblema deja los estaticos: mejor eso que una pestana sin icono', async () => {
    ponerEstaticos()
    await render(<Pantalla url={null} />)

    expect(iconos()).toHaveLength(2)
  })
})
