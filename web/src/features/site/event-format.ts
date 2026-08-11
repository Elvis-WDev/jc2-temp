import { LOCALE } from '@/lib/locale'
import { type PublicEvent } from './api'

/**
 * "12 March 2026", o "12 March — 14 March 2026".
 *
 * La API entrega el instante y el navegador lo escribe, pero con el idioma de la
 * interfaz y no con el del visitante: una agenda en castellano dentro de una pagina en
 * ingles no es cortesia, es una mezcla.
 */
export function rangoDeFechas(
  event: Pick<PublicEvent, 'startsAt' | 'endsAt'>
): string {
  const inicio = new Date(event.startsAt)
  const fin = event.endsAt === null ? null : new Date(event.endsAt)

  const dia = (fecha: Date) =>
    fecha.toLocaleDateString(LOCALE, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  if (fin === null || dia(fin) === dia(inicio)) return dia(inicio)
  return `${dia(inicio)} — ${dia(fin)}`
}
