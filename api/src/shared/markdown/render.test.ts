import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render.js'

describe('renderMarkdown', () => {
  it('convierte Markdown basico', () => {
    const html = renderMarkdown('# Titulo\n\nTexto con **negrita**.')

    expect(html).toContain('<h1>Titulo</h1>')
    expect(html).toContain('<strong>negrita</strong>')
  })

  it('trata el vacio como ausencia de contenido', () => {
    expect(renderMarkdown(null)).toBeNull()
    expect(renderMarkdown('')).toBeNull()
    expect(renderMarkdown('   ')).toBeNull()
  })
})

// ERS §37: bloquear <script>, handlers onclick, URLs javascript: y HTML no permitido.
describe('saneado (ERS §37)', () => {
  it('elimina etiquetas script', () => {
    const html = renderMarkdown('Antes\n\n<script>alert(1)</script>\n\nDespues')

    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
    expect(html).toContain('Antes')
  })

  it('elimina handlers de eventos', () => {
    const html = renderMarkdown('<p onclick="alert(1)">Texto</p>')

    expect(html).not.toContain('onclick')
    expect(html).toContain('Texto')
  })

  it('elimina URLs javascript: en enlaces', () => {
    const html = renderMarkdown('[pulsa](javascript:alert(1))')

    expect(html).not.toContain('javascript:')
  })

  it('conserva enlaces http y https', () => {
    const html = renderMarkdown('[doi](https://doi.org/10.1016/j.x)')

    expect(html).toContain('href="https://doi.org/10.1016/j.x"')
  })

  it('anade rel noopener a los enlaces, para que no manipulen la pestana de origen', () => {
    const html = renderMarkdown('[x](https://example.test)')

    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('elimina los iframes que no apuntan a un servidor de video conocido', () => {
    // Desde la fase 4 el iframe existe, pero solo hacia la lista de `SERVIDORES_DE_VIDEO`.
    const html = renderMarkdown('<iframe src="https://evil.test"></iframe>')

    expect(html).not.toContain('iframe')
  })

  it('elimina img hacia otro servidor, que permite exfiltrar por la URL', () => {
    // Desde la fase 4 se pueden intercalar imagenes, pero solo de la biblioteca de este
    // sitio: una alojada fuera le cuenta a ese servidor la IP de cada visitante.
    const html = renderMarkdown('![x](https://evil.test/pixel?token=abc)')

    expect(html).not.toContain('<img')
  })

  it('conserva tablas y listas, que si son contenido academico legitimo', () => {
    const html = renderMarkdown('- uno\n- dos')

    expect(html).toContain('<ul>')
    expect(html).toContain('<li>uno</li>')
  })
})

// Fase 4: el video se incrusta, no se aloja. Y solo de donde se dice.
describe('video incrustado', () => {
  it('una direccion de YouTube sola en su linea se convierte en reproductor', () => {
    const html = renderMarkdown('Mira esto:\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n')

    expect(html).toContain('<iframe')
    // Sin cookies: mismo reproductor, sin rastro para quien solo pasaba por la pagina.
    expect(html).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('acepta la forma corta y la de Vimeo', () => {
    expect(renderMarkdown('https://youtu.be/dQw4w9WgXcQ')).toContain(
      'youtube-nocookie.com/embed/dQw4w9WgXcQ',
    )
    expect(renderMarkdown('https://vimeo.com/76979871')).toContain(
      'https://player.vimeo.com/video/76979871',
    )
  })

  it('una direccion citada dentro de un parrafo se queda como estaba', () => {
    // Solo se incrusta la que va sola en su linea: si no, un enlace mencionado de paso
    // se convertiria en un reproductor en mitad de la frase.
    const html = renderMarkdown(
      'Lo conto en https://www.youtube.com/watch?v=dQw4w9WgXcQ hace anos.',
    )

    expect(html).not.toContain('<iframe')
  })

  it('un iframe hacia otro sitio se elimina', () => {
    // Es la razon de que esto sea una lista de servidores y no «iframe permitido»: un
    // iframe libre es una pagina entera de otro dominio dentro de la nuestra.
    const html = renderMarkdown('<iframe src="https://evil.example/x"></iframe>')

    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('evil.example')
  })

  it('un iframe de YouTube pegado a mano se respeta', () => {
    const html = renderMarkdown('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')

    expect(html).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('no deja pasar handlers dentro del iframe', () => {
    const html = renderMarkdown(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" onload="alert(1)"></iframe>',
    )

    expect(html).not.toContain('onload')
  })
})

describe('imagenes de la biblioteca', () => {
  const ID = '01a01b8b-0970-76af-8ad4-83e9ad1e11ff'

  it('acepta una imagen servida por este mismo sitio', () => {
    const html = renderMarkdown(`![La pizarra](/api/public/media/${ID})`)

    expect(html).toContain(`src="/api/public/media/${ID}"`)
    expect(html).toContain('alt="La pizarra"')
  })

  it('acepta la direccion absoluta y la deja relativa', () => {
    // Es lo que se copia del navegador; guardarla con servidor ataria el contenido al
    // dominio de hoy.
    const html = renderMarkdown(`![x](https://jc.example/api/public/media/${ID})`)

    expect(html).toContain(`src="/api/public/media/${ID}"`)
    expect(html).not.toContain('jc.example')
  })

  it('una direccion de otro servidor disfrazada de media se queda en este origen', () => {
    // `//otro/api/public/media/<id>` es una direccion de otro dominio con ruta valida:
    // se conserva la ruta y se pierde el dominio.
    const html = renderMarkdown(`![x](//evil.test/api/public/media/${ID})`)

    expect(html).not.toContain('evil.test')
    expect(html).toContain(`src="/api/public/media/${ID}"`)
  })

  it('no deja pasar una ruta de media inventada', () => {
    const html = renderMarkdown('![x](/api/public/media/../../etc/passwd)')

    expect(html).not.toContain('<img')
  })

  it('no deja pasar javascript: dentro de una imagen', () => {
    const html = renderMarkdown('<img src="javascript:alert(1)">')

    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<img')
  })
})
