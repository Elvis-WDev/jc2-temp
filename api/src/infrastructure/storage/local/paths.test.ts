import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  UnsafeStorageKeyError,
  assertSafeStorageKey,
  buildStorageKey,
  resolveStoragePath,
} from './paths.js'

const RAIZ = '/srv/jc2/storage'
const NULO = String.fromCharCode(0)

describe('buildStorageKey', () => {
  it('particiona por visibilidad, ano y mes', () => {
    const key = buildStorageKey({
      visibility: 'private',
      extension: 'pdf',
      id: '0198f0a1-0000-7000-8000-000000000001',
      now: new Date('2026-08-10T12:00:00Z'),
    })

    expect(key).toBe('private/2026/08/0198f0a1-0000-7000-8000-000000000001.pdf')
  })

  it('rellena el mes a dos digitos', () => {
    const key = buildStorageKey({
      visibility: 'public',
      extension: 'png',
      id: 'abc',
      now: new Date('2026-01-05T00:00:00Z'),
    })

    expect(key).toContain('/2026/01/')
  })
})

describe('assertSafeStorageKey', () => {
  it('acepta una clave generada por el servidor', () => {
    expect(() => {
      assertSafeStorageKey('private/2026/08/abc.pdf')
    }).not.toThrow()
  })

  it.each([
    ['vacia', ''],
    ['segmento padre', '../../etc/passwd'],
    ['padre intercalado', 'private/2026/../../../etc/passwd'],
    ['ruta absoluta', '/etc/passwd'],
    ['separador de Windows al inicio', '\\windows\\system32'],
    ['padre con separador de Windows', 'private\\..\\..\\etc\\passwd'],
  ])('rechaza %s', (_caso, clave) => {
    expect(() => {
      assertSafeStorageKey(clave)
    }).toThrow(UnsafeStorageKeyError)
  })

  it('rechaza un byte nulo, que truncaria la ruta en llamadas al sistema', () => {
    expect(() => {
      assertSafeStorageKey(`private/2026/08/abc.pdf${NULO}.txt`)
    }).toThrow(UnsafeStorageKeyError)
  })

  it('no confunde puntos consecutivos dentro de un nombre con un segmento padre', () => {
    expect(() => {
      assertSafeStorageKey('private/2026/08/informe..final.pdf')
    }).not.toThrow()
  })
})

describe('resolveStoragePath', () => {
  it('resuelve dentro de la raiz', () => {
    expect(resolveStoragePath(RAIZ, 'public/2026/08/x.png')).toBe(
      path.join(RAIZ, 'public/2026/08/x.png'),
    )
  })

  it.each([
    '../../../etc/passwd',
    'public/../../../../etc/shadow',
    '/etc/passwd',
  ])('impide escapar con %s', (clave) => {
    expect(() => resolveStoragePath(RAIZ, clave)).toThrow(UnsafeStorageKeyError)
  })

  it('no acepta un hermano cuyo nombre empieza igual que la raiz', () => {
    // Sin comparar el separador final, "/srv/jc2/storage-publico" pasaria por
    // empezar por "/srv/jc2/storage".
    expect(() => resolveStoragePath('/srv/jc2/storage', '../storage-publico/x.png')).toThrow(
      UnsafeStorageKeyError,
    )
  })
})
