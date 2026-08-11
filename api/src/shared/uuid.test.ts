import { describe, expect, it } from 'vitest'
import { isUuid, matchIdOrSlug } from './uuid.js'

/**
 * Cubre el fallo que dejaba rota toda la web publica de detalle: `id` es una columna
 * `uuid`, y compararla con un slug hace que PostgreSQL rechace la consulta entera. Abrir
 * un trabajo o un curso por su direccion legible devolvia 500; por su identificador,
 * 200. Como la web solo usa direcciones legibles, ninguna ficha se abria.
 */

describe('reconocer un identificador', () => {
  it('acepta los que genera el proyecto, que son de version 7', () => {
    expect(isUuid('019fefe7-4280-768b-ade6-40077d4c1e06')).toBe(true)
  })

  it('acepta tambien los de version 4', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true)
  })

  it('rechaza un slug, por parecido que sea', () => {
    expect(isUuid('microeconomia-avanzada')).toBe(false)
    expect(isUuid('019fefe7-4280-768b-ade6')).toBe(false)
    expect(isUuid('')).toBe(false)
  })
})

describe('buscar por identificador o por slug', () => {
  it('con un identificador pregunta por los dos campos', () => {
    expect(matchIdOrSlug('019fefe7-4280-768b-ade6-40077d4c1e06')).toEqual([
      { id: '019fefe7-4280-768b-ade6-40077d4c1e06' },
      { slug: '019fefe7-4280-768b-ade6-40077d4c1e06' },
    ])
  })

  it('con un slug NO pregunta por el identificador', () => {
    // Esta es la linea que evita el 500: sin ella la consulta compara un texto
    // cualquiera con una columna uuid.
    expect(matchIdOrSlug('microeconomia-avanzada')).toEqual([{ slug: 'microeconomia-avanzada' }])
  })
})
