import { describe, expect, it } from 'vitest'
import { MEDIA_KINDS, kindOfMime, mimesForKind, todosLosMimesAceptados } from './MediaKind.js'

describe('familias de archivo', () => {
  /**
   * Esta es la prueba que importa: si se acepta un formato nuevo en la politica de
   * subida y nadie lo clasifica aqui, sus archivos no apareceran bajo ningun filtro y
   * el fallo se descubriria buscando algo que se subio y "no esta".
   */
  it('todo formato que se puede subir cae en alguna familia', () => {
    const sinClasificar = todosLosMimesAceptados().filter((mime) => kindOfMime(mime) === null)
    expect(sinClasificar).toEqual([])
  })

  it('ninguna familia reclama el mismo MIME que otra', () => {
    const vistos = new Map<string, string>()
    for (const kind of MEDIA_KINDS) {
      for (const mime of mimesForKind(kind)) {
        expect(vistos.get(mime), `${mime} esta en dos familias`).toBeUndefined()
        vistos.set(mime, kind)
      }
    }
  })

  it('clasifica lo que el academico sube a diario', () => {
    expect(kindOfMime('application/pdf')).toBe('document')
    expect(kindOfMime('image/png')).toBe('image')
    expect(kindOfMime('text/csv')).toBe('data')
    expect(kindOfMime('text/x-tex')).toBe('text')
    expect(kindOfMime('application/zip')).toBe('archive')
  })

  it('no inventa una familia para un MIME que no acepta', () => {
    expect(kindOfMime('image/svg+xml')).toBeNull()
    expect(kindOfMime('application/x-cfb')).toBeNull()
  })
})
