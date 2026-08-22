import { afterEach, describe, expect, it } from 'vitest'
import { fijarHusoDelSitio, reiniciarHusoDelSitio } from '@/lib/huso'
import { rangoDeFechas } from './event-format'

/**
 * Cuando es un evento.
 *
 * Estas pruebas cambiaron de asunto: antes daban por bueno que la fecha se escribiera con
 * el reloj de quien mira y solo comprobaban la forma —un dia, o dos separados—. Ese era
 * justo el fallo: el mismo festival salia el 15 de diciembre en Sydney, el 14 en Madrid y
 * el 14 en Honolulu. Ahora lo que se prueba es que **diga lo mismo desde donde sea**.
 *
 * Una de ellas caia con el codigo nuevo y tenia razon en caer: usaba un evento de las
 * 10:00 a las 18:00 UTC como ejemplo de «un solo dia», y en Sydney eso son las 21:00 del
 * 12 y las 05:00 del 13. Con el reloj del sitio, ese evento **si** ocupa dos dias.
 */

afterEach(() => {
  reiniciarHusoDelSitio()
})

describe('la fecha de un evento', () => {
  // Que el huso del NAVEGADOR no influya no se puede probar aqui —no se puede cambiar
  // el del navegador dentro de una prueba—: eso lo comprueba el barrido, abriendo la
  // misma pagina desde Sydney, Madrid, Lima y Honolulu. Aqui se prueba lo otro: que el
  // que manda es el del sitio.

  it('la escribe con el reloj del sitio, no con el de quien lee', () => {
    // Las 22:00 UTC del 14 son el 15 en Sydney y todavia el 14 en Madrid.
    const festival = { startsAt: '2026-12-14T22:00:00.000Z', endsAt: null }

    expect(rangoDeFechas(festival)).toContain('15 December 2026')

    fijarHusoDelSitio('Europe/Madrid')
    expect(rangoDeFechas(festival)).toContain('14 December 2026')
  })

  it('en un solo dia ensena la hora, con el nombre del huso', () => {
    // Se pedia al minuto, se guardaba y no se ensenaba en ninguna parte.
    const texto = rangoDeFechas({
      startsAt: '2026-12-14T22:00:00.000Z',
      endsAt: null,
    })

    expect(texto).toMatch(/9:00\s?am/i)
    expect(texto).toContain('AEDT')
  })

  it('empezando y acabando el mismo dia del sitio, sigue siendo un dia', () => {
    // 22:00 y 06:00 UTC son las 09:00 y las 17:00 del 15 en Sydney: un seminario.
    const texto = rangoDeFechas({
      startsAt: '2026-12-14T22:00:00.000Z',
      endsAt: '2026-12-15T06:00:00.000Z',
    })

    expect(texto).not.toContain('—')
    expect(texto).toContain('15 December 2026')
  })

  it('en varios dias se ensenan los dos extremos y no la hora', () => {
    const texto = rangoDeFechas({
      startsAt: '2026-12-14T22:00:00.000Z',
      endsAt: '2026-12-16T06:00:00.000Z',
    })

    expect(texto).toContain('—')
    expect(texto).not.toContain('AEDT')
  })

  it('lo que en UTC parece un dia puede ser dos en el sitio, y se dice', () => {
    // De 10:00 a 18:00 UTC: en Sydney, de las 21:00 del 12 a las 05:00 del 13.
    const texto = rangoDeFechas({
      startsAt: '2026-03-12T10:00:00.000Z',
      endsAt: '2026-03-12T18:00:00.000Z',
    })

    expect(texto).toContain('—')
  })
})
