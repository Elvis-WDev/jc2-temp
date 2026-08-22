import { describe, expect, it } from 'vitest'
import { extractoDeMarkdown } from './excerpt.js'

/**
 * El extracto que sale en la tarjeta de una publicacion.
 *
 * Existe porque durante un tiempo no habia ninguna prueba y la tarjeta ensenaba la
 * sintaxis del Markdown en crudo: `**strong**`, `[texto](url)`, `## titulo`. El campo
 * dice «Markdown works here» y desde la barra de botones se escribe asi sin pensarlo.
 */

const LARGO = 420

describe('el extracto de un Markdown', () => {
  it('no ensena la sintaxis, solo lo que se lee', () => {
    const extracto = extractoDeMarkdown(
      'We show **strong** revenue results, see [the appendix](https://ejemplo.invalid) and `theta_i`.',
      LARGO,
    )

    expect(extracto).toBe('We show strong revenue results, see the appendix and theta_i.')
  })

  it('los titulos y las listas se vuelven texto seguido, no se pegan entre si', () => {
    const extracto = extractoDeMarkdown('## Second heading\n\n- first bullet\n- second bullet', LARGO)

    expect(extracto).toBe('Second heading first bullet second bullet')
  })

  it('una direccion de video suelta desaparece en vez de quedarse como URL', () => {
    // Va sola en su linea, que es la forma en que el cuerpo la convierte en reproductor.
    // Convirtiendo con `marked` a secas se quedaria la direccion entera en medio.
    const extracto = extractoDeMarkdown(
      'Antes del video.\n\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n\nDespues.',
      LARGO,
    )

    expect(extracto).toBe('Antes del video. Despues.')
    expect(extracto).not.toContain('youtube')
  })

  it('una imagen intercalada tampoco deja rastro', () => {
    const extracto = extractoDeMarkdown(
      'Un parrafo.\n\n![una foto](/api/public/media/00000000-0000-0000-0000-000000000000)',
      LARGO,
    )

    expect(extracto).toBe('Un parrafo.')
  })

  it('devuelve los simbolos, no sus entidades', () => {
    const extracto = extractoDeMarkdown('Auctions A & B con x > y, "citado" y a<b', LARGO)

    expect(extracto).toBe('Auctions A & B con x > y, "citado" y a<b')
  })

  it('un `&lt;` escrito a proposito sigue siendo texto, no se decodifica dos veces', () => {
    const extracto = extractoDeMarkdown('Se escribe &amp;lt; para poner un menor que', LARGO)

    expect(extracto).toBe('Se escribe &lt; para poner un menor que')
  })

  it('corta por el ultimo espacio y remata con puntos suspensivos', () => {
    const extracto = extractoDeMarkdown('uno dos tres cuatro cinco', 12)

    expect(extracto).toBe('uno dos…')
  })

  it('sin espacios donde cortar, corta en seco antes que pasarse de largo', () => {
    const extracto = extractoDeMarkdown('a'.repeat(50), 10)

    expect(extracto).toHaveLength(10)
  })

  it('lo que cabe entero sale entero, sin puntos suspensivos', () => {
    expect(extractoDeMarkdown('Corto y ya.', LARGO)).toBe('Corto y ya.')
  })

  it('vacio, en blanco o nulo no devuelven una cadena vacia sino nada', () => {
    expect(extractoDeMarkdown(null, LARGO)).toBeNull()
    expect(extractoDeMarkdown('', LARGO)).toBeNull()
    expect(extractoDeMarkdown('   \n\n  ', LARGO)).toBeNull()
  })

  it('el limite se cuenta sobre el texto ya convertido, no sobre el Markdown', () => {
    // Con la sintaxis contando, esto pasaria de 40 y saldria recortado; sin ella cabe.
    const conSintaxis = '**Uno** _dos_ [tres](https://ejemplo.invalid/muy/larga) cuatro'

    expect(extractoDeMarkdown(conSintaxis, 40)).toBe('Uno dos tres cuatro')
  })
})
