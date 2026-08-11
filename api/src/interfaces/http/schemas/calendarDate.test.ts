import { describe, expect, it } from 'vitest'
import { calendarDateSchema, toCalendarDate } from './common.schemas.js'

/**
 * Estas pruebas cubren un fallo que afectaba a los tres modulos con fechas: el esquema
 * dejaba pasar la cadena "2024-05-01" tal cual y Prisma, que espera un `Date` para una
 * columna `date`, respondia 500. No se podia guardar la fecha de publicacion de un
 * trabajo, ni el periodo de una edicion de curso, ni el de una afiliacion.
 */

describe('fecha que entra', () => {
  it('convierte el dia a Date, que es lo que espera la base de datos', () => {
    const resultado = calendarDateSchema.parse('2024-05-01')
    expect(resultado).toBeInstanceOf(Date)
    expect(resultado.toISOString()).toBe('2024-05-01T00:00:00.000Z')
  })

  it('acepta tambien el instante completo que devuelven las rutas de admin', () => {
    // Sin esto, cargar una fecha en un formulario y volver a guardarla sin tocarla
    // seria rechazado.
    expect(calendarDateSchema.parse('2024-05-01T00:00:00.000Z')).toBeInstanceOf(Date)
  })

  it('no interpreta el dia en la zona del servidor', () => {
    // Construido desde AAAA-MM-DD, JavaScript lo lee en UTC. Si se interpretara en
    // hora local, al oeste de Londres se guardaria el dia anterior.
    expect(calendarDateSchema.parse('2024-01-01').getUTCDate()).toBe(1)
    expect(calendarDateSchema.parse('2024-12-31').getUTCDate()).toBe(31)
  })

  it('rechaza lo que no es una fecha', () => {
    expect(() => calendarDateSchema.parse('ayer')).toThrow()
    expect(() => calendarDateSchema.parse('2024-13-01')).toThrow()
    expect(() => calendarDateSchema.parse('')).toThrow()
  })
})

describe('fecha que sale', () => {
  it('devuelve el dia, no el instante', () => {
    expect(toCalendarDate(new Date('2024-05-01T00:00:00.000Z'))).toBe('2024-05-01')
  })

  it('deja pasar el vacio', () => {
    expect(toCalendarDate(null)).toBeNull()
  })

  it('lo que sale se puede volver a meter', () => {
    const original = calendarDateSchema.parse('2020-03-01')
    const texto = toCalendarDate(original)
    expect(calendarDateSchema.parse(texto as string).getTime()).toBe(original.getTime())
  })
})
