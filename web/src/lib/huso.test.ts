import { afterEach, describe, expect, it } from 'vitest'
import {
  aHoraDelSitio,
  desdeHoraDelSitio,
  fijarHusoDelSitio,
  husoDelSitioActual,
  reiniciarHusoDelSitio,
} from './huso'

/**
 * El reloj del sitio.
 *
 * Lo que se prueba aqui es lo unico que puede estropear una fecha ya guardada: que ir y
 * volver devuelva el mismo instante, tambien en los dos saltos de horario del ano.
 */

afterEach(() => {
  reiniciarHusoDelSitio()
})

describe('el huso del sitio', () => {
  it('por defecto es el de Sydney, no el del navegador', () => {
    expect(husoDelSitioActual()).toBe('Australia/Sydney')
  })

  it('se puede cambiar por el que digan los ajustes', () => {
    fijarHusoDelSitio('Europe/Madrid')

    expect(husoDelSitioActual()).toBe('Europe/Madrid')
  })

  it('un huso que no existe no tumba la pagina, se queda con el de partida', () => {
    fijarHusoDelSitio('Marte/Olympus_Mons')

    expect(husoDelSitioActual()).toBe('Australia/Sydney')
  })

  it('vacio o nulo tampoco lo cambian', () => {
    fijarHusoDelSitio('Europe/Madrid')
    fijarHusoDelSitio('')
    fijarHusoDelSitio(null)

    expect(husoDelSitioActual()).toBe('Europe/Madrid')
  })
})

describe('escribir un instante con el reloj del sitio', () => {
  it('las 22:00 UTC de un 14 de diciembre son las 09:00 del 15 en Sydney', () => {
    expect(aHoraDelSitio('2026-12-14T22:00:00.000Z')).toBe('2026-12-15T09:00')
  })

  it('el mismo instante, con el reloj de Madrid, es otro dia y otra hora', () => {
    fijarHusoDelSitio('Europe/Madrid')

    expect(aHoraDelSitio('2026-12-14T22:00:00.000Z')).toBe('2026-12-14T23:00')
  })

  it('la medianoche sale como 00 y no como 24', () => {
    expect(aHoraDelSitio('2026-12-14T13:00:00.000Z')).toBe('2026-12-15T00:00')
  })

  it('sin fecha devuelve vacio, no "Invalid Date"', () => {
    expect(aHoraDelSitio(null)).toBe('')
    expect(aHoraDelSitio('')).toBe('')
  })
})

describe('leer lo que se teclea con el reloj del sitio', () => {
  it('las 09:30 de un dia de noviembre en Sydney son las 22:30 UTC del dia antes', () => {
    expect(desdeHoraDelSitio('2026-11-05T09:30').toISOString()).toBe(
      '2026-11-04T22:30:00.000Z'
    )
  })

  it('ir y volver devuelve exactamente lo mismo', () => {
    for (const local of [
      '2026-01-15T09:30',
      '2026-06-30T23:59',
      '2026-11-05T00:00',
      '2027-03-01T12:00',
    ]) {
      expect(aHoraDelSitio(desdeHoraDelSitio(local).toISOString())).toBe(local)
    }
  })

  it('aguanta el salto de octubre, cuando Sydney adelanta el reloj', () => {
    // El 4 de octubre de 2026 a las 02:00 pasan a ser las 03:00.
    for (const local of [
      '2026-10-03T23:00',
      '2026-10-04T01:30',
      '2026-10-04T03:30',
      '2026-10-05T09:00',
    ]) {
      expect(aHoraDelSitio(desdeHoraDelSitio(local).toISOString())).toBe(local)
    }
  })

  it('y el de abril, cuando lo atrasa y una hora se repite', () => {
    // El 5 de abril de 2026 a las 03:00 vuelven a ser las 02:00: hay dos «02:30».
    for (const local of [
      '2026-04-04T22:00',
      '2026-04-05T01:30',
      '2026-04-05T04:00',
      '2026-04-06T09:00',
    ]) {
      expect(aHoraDelSitio(desdeHoraDelSitio(local).toISOString())).toBe(local)
    }
  })

  it('cambiar de huso cambia el instante, que es de lo que se trata', () => {
    const enSydney = desdeHoraDelSitio('2026-11-05T09:30').toISOString()
    fijarHusoDelSitio('Europe/Madrid')
    const enMadrid = desdeHoraDelSitio('2026-11-05T09:30').toISOString()

    expect(enSydney).not.toBe(enMadrid)
    expect(enMadrid).toBe('2026-11-05T08:30:00.000Z')
  })

  it('sin texto devuelve una fecha invalida, para que el formulario la rechace', () => {
    expect(Number.isNaN(desdeHoraDelSitio('').getTime())).toBe(true)
  })
})
