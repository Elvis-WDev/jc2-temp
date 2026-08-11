import { describe, expect, it } from 'vitest'
import { type CatalogTerm } from '@/features/catalogs/api'
import { conValorActual } from './use-catalog-terms'

/**
 * `conValorActual` es lo que evita perder datos al ocultar un termino.
 *
 * Los codigos se guardan como texto sin clave foranea, asi que un registro puede llevar
 * uno que ya no esta en la lista: porque se oculto, porque se borro o porque vino de
 * otro sistema. Si el desplegable no lo incluyera, al abrir ese registro saldria vacio y
 * al guardar se cambiaria el valor sin que nadie lo pidiera.
 */

const TERMINOS: CatalogTerm[] = [
  {
    id: '1',
    catalog: 'work_link',
    code: 'doi',
    label: 'DOI',
    sortOrder: 0,
    description: null,
    isActive: true,
  },
  {
    id: '2',
    catalog: 'work_link',
    code: 'publisher',
    label: 'Editorial',
    description: null,
    sortOrder: 1,
    isActive: true,
  },
]

describe('opciones de un desplegable', () => {
  it('son las del catalogo cuando el valor guardado esta en la lista', () => {
    expect(conValorActual(TERMINOS, 'doi')).toEqual([
      { code: 'doi', label: 'DOI' },
      { code: 'publisher', label: 'Editorial' },
    ])
  })

  it('anade el valor guardado si ya no figura en la lista', () => {
    // Un tipo que se oculto despues de usarlo, o importado de otro sistema.
    expect(conValorActual(TERMINOS, 'preprint')).toContainEqual({
      code: 'preprint',
      label: 'preprint',
    })
  })

  it('no anade nada cuando todavia no hay valor', () => {
    expect(conValorActual(TERMINOS, '')).toHaveLength(2)
  })

  it('con el catalogo vacio, deja al menos el valor guardado', () => {
    // Si no, un registro existente se quedaria sin ninguna opcion que elegir.
    expect(conValorActual([], 'doi')).toEqual([{ code: 'doi', label: 'doi' }])
  })
})
