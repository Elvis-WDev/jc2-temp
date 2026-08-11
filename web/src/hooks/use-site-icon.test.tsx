import { afterEach, describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { useSiteIcon } from './use-site-icon'

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
