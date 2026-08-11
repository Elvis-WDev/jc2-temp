import { describe, expect, it } from 'vitest'
import { assertPageCanBeHidden, esVisible } from './PageRules.js'

describe('la portada no se puede ocultar', () => {
  it('rechaza ocultar home', () => {
    // La regla vive en el dominio y no solo en el formulario: quien llame a la API por
    // su cuenta tiene que encontrarse lo mismo que quien usa el panel.
    expect(() => {
      assertPageCanBeHidden('home')
    }).toThrowError(expect.objectContaining({ code: 'HOME_PAGE_ALWAYS_VISIBLE' }))
  })

  it('deja ocultar las demas', () => {
    for (const pagina of ['research', 'teaching', 'events']) {
      expect(() => {
        assertPageCanBeHidden(pagina)
      }).not.toThrow()
    }
  })
})

describe('visibilidad de una seccion', () => {
  const SECCIONES = [
    { pageKey: 'home', sectionKey: 'hero', isVisible: true },
    { pageKey: 'home', sectionKey: 'carousel', isVisible: false },
  ]

  it('respeta lo que dice su fila', () => {
    expect(esVisible(SECCIONES, 'home', 'hero')).toBe(true)
    expect(esVisible(SECCIONES, 'home', 'carousel')).toBe(false)
  })

  it('sin fila, visible', () => {
    // Anadir una seccion al codigo no puede exigir una migracion para que se vea: si no
    // hay fila, se ensena, y el titular la apaga si no la quiere.
    expect(esVisible(SECCIONES, 'home', 'seccion_que_nadie_ha_sembrado')).toBe(true)
  })

  it('no confunde secciones de paginas distintas con el mismo nombre', () => {
    const conDosCabeceras = [
      { pageKey: 'research', sectionKey: 'header', isVisible: false },
      { pageKey: 'teaching', sectionKey: 'header', isVisible: true },
    ]

    expect(esVisible(conDosCabeceras, 'research', 'header')).toBe(false)
    expect(esVisible(conDosCabeceras, 'teaching', 'header')).toBe(true)
  })
})
