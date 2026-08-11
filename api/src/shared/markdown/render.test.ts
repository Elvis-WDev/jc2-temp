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

  it('elimina iframes y objetos incrustados', () => {
    const html = renderMarkdown('<iframe src="https://evil.test"></iframe>')

    expect(html).not.toContain('iframe')
  })

  it('elimina img, que permite exfiltrar por la URL', () => {
    // Las imagenes del contenido van por media_assets, no incrustadas en Markdown.
    const html = renderMarkdown('![x](https://evil.test/pixel?token=abc)')

    expect(html).not.toContain('<img')
  })

  it('conserva tablas y listas, que si son contenido academico legitimo', () => {
    const html = renderMarkdown('- uno\n- dos')

    expect(html).toContain('<ul>')
    expect(html).toContain('<li>uno</li>')
  })
})
