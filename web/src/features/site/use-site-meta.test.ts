import { describe, expect, it } from 'vitest'
import { resumirHtml, titulo } from './use-site-meta'

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
