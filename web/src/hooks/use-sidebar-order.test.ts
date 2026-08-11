import { describe, expect, it } from 'vitest'
import { aplicarOrden } from './use-sidebar-order'

const ITEMS = [
  { title: 'Work' },
  { title: 'Authors' },
  { title: 'Work types' },
  { title: 'Tags' },
]

const titulos = (items: { title: string }[]) => items.map((item) => item.title)

describe('orden personalizado del menu', () => {
  it('sin preferencia guardada, respeta el orden original', () => {
    expect(aplicarOrden(undefined, ITEMS)).toEqual(ITEMS)
  })

  it('aplica el orden guardado', () => {
    const guardado = ['Tags', 'Work', 'Authors', 'Work types']

    expect(titulos(aplicarOrden(guardado, ITEMS))).toEqual(guardado)
  })

  it('una entrada nueva del menu no desaparece: va al final', () => {
    // Autores y Tipos no estaban cuando se guardo la preferencia.
    expect(titulos(aplicarOrden(['Tags', 'Work'], ITEMS))).toEqual([
      'Tags',
      'Work',
      'Authors',
      'Work types',
    ])
  })

  it('las entradas que ya no existen se ignoran sin romper nada', () => {
    const guardado = ['Modulo borrado', 'Tags', 'Work', 'Authors', 'Work types']

    expect(titulos(aplicarOrden(guardado, ITEMS))).toEqual([
      'Tags',
      'Work',
      'Authors',
      'Work types',
    ])
  })

  it('no modifica la lista original', () => {
    const copia = [...ITEMS]
    aplicarOrden(['Tags'], ITEMS)

    expect(ITEMS).toEqual(copia)
  })

  it('un orden vacio deja la lista como estaba', () => {
    expect(titulos(aplicarOrden([], ITEMS))).toEqual(titulos(ITEMS))
  })
})
