import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * El listado de Research va agrupado por tipo, y dentro de cada tipo manda RF-012: lo
 * que el titular haya colocado a mano primero, y el resto por ano descendente.
 *
 * Esto se comprueba leyendo el codigo, como en `mediaReferences.test.ts`, porque el
 * orden lo arma Prisma y probarlo de otra forma pediria una base de datos. La razon de
 * que exista: al anadir el modo `type` se olvido `displayOrder`, y el campo del panel
 * dejo de tener efecto sin que nada fallara.
 */
const FUENTE = readFileSync(new URL('./PrismaPublicWorkRepository.ts', import.meta.url), 'utf8')

function bloqueDelModo(modo: string): string {
  const inicio = FUENTE.indexOf(`case '${modo}':`)
  expect(inicio, `no existe el modo ${modo}`).toBeGreaterThan(-1)
  const resto = FUENTE.slice(inicio)
  const fin = resto.indexOf(']', resto.indexOf('return ['))
  return resto.slice(0, fin)
}

describe('orden del listado publico', () => {
  it('agrupado por tipo, respeta el orden manual del panel', () => {
    const bloque = bloqueDelModo('type')

    expect(bloque).toContain('displayOrder')
    // Y despues del tipo: primero se agrupa, luego se ordena dentro del grupo.
    expect(bloque.indexOf('workType')).toBeLessThan(bloque.indexOf('displayOrder'))
  })

  it('dentro del tipo, lo mas reciente primero cuando no hay orden manual', () => {
    const bloque = bloqueDelModo('type')

    expect(bloque).toContain("publicationYear: 'desc'")
    expect(bloque.indexOf('displayOrder')).toBeLessThan(bloque.indexOf('publicationYear'))
  })
})
