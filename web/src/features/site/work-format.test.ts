import { describe, expect, it } from 'vitest'
import { coautores, periodo, referencia } from './work-format'

describe('coautores', () => {
  it('descuenta al titular: en su propia web sobra su nombre', () => {
    expect(coautores(['Juana Castro', 'Ana Soto'], 'Juana Castro')).toBe(
      'with Ana Soto'
    )
  })

  it('con varios, separa por comas y cierra con "and"', () => {
    expect(
      coautores(['Juana Castro', 'Ana Soto', 'Luis Paz'], 'Juana Castro')
    ).toBe('with Ana Soto and Luis Paz')
  })

  it('si el titular es el unico autor, lo dice', () => {
    expect(coautores(['Juana Castro'], 'Juana Castro')).toBe('Sole author')
  })

  it('sin saber quien es el titular, no descuenta a nadie', () => {
    expect(coautores(['Ana Soto'], null)).toBe('with Ana Soto')
  })
})

describe('referencia de la publicacion', () => {
  it('junta revista, volumen y numero', () => {
    expect(referencia({ venue: 'QJE', volume: '139', issue: '2' })).toBe(
      'QJE, Vol. 139 (2)'
    )
  })

  it('sin numero, solo el volumen', () => {
    expect(referencia({ venue: 'QJE', volume: '139', issue: null })).toBe(
      'QJE, Vol. 139'
    )
  })

  it('sin volumen ni numero, solo la revista', () => {
    expect(referencia({ venue: 'QJE', volume: null, issue: null })).toBe('QJE')
  })

  it('sin revista no hay linea que escribir', () => {
    expect(referencia({ venue: null, volume: '139', issue: '2' })).toBeNull()
  })
})

describe('periodo de una edicion', () => {
  const edicion = {
    institution: 'Universidad',
    department: null,
    teachingRole: null,
    isActive: true,
  }

  it('junta periodo y ano', () => {
    expect(periodo({ ...edicion, term: 'Otono', academicYear: 2026 })).toBe(
      'Otono 2026'
    )
  })

  it('con solo el ano, el ano', () => {
    expect(periodo({ ...edicion, term: null, academicYear: 2026 })).toBe('2026')
  })

  it('sin edicion, nada', () => {
    expect(periodo(null)).toBeNull()
  })
})
