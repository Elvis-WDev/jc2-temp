import { describe, expect, it } from 'vitest'
import { rangoDeFechas } from './event-format'

/**
 * La fecha se escribe en el navegador, con el idioma de quien mira. Las pruebas no
 * fijan el formato —depende del idioma— sino la forma: un dia o dos separados.
 */
describe('rango de fechas de un evento', () => {
  it('sin fecha de fin es un solo dia', () => {
    const texto = rangoDeFechas({
      startsAt: '2026-03-12T10:00:00.000Z',
      endsAt: null,
    })

    expect(texto).not.toContain('—')
    expect(texto).toContain('2026')
  })

  it('empezando y acabando el mismo dia tampoco se repite', () => {
    // Un seminario de una tarde tiene hora de fin, pero sigue siendo un dia.
    const texto = rangoDeFechas({
      startsAt: '2026-03-12T10:00:00.000Z',
      endsAt: '2026-03-12T18:00:00.000Z',
    })

    expect(texto).not.toContain('—')
  })

  it('en varios dias se muestran los dos extremos', () => {
    const texto = rangoDeFechas({
      startsAt: '2026-03-12T10:00:00.000Z',
      endsAt: '2026-03-14T18:00:00.000Z',
    })

    expect(texto).toContain('—')
  })
})
