import { husoDelSitioActual } from '@/lib/huso'
import { LOCALE } from '@/lib/locale'
import { type PublicEvent } from './api'

/**
 * Cuando es un evento, escrito con el reloj del sitio.
 *
 * **Con el del sitio y no con el de quien mira**, que era el fallo: el mismo festival
 * salia el 15 de diciembre en Sydney, el 14 en Madrid y el 14 en Honolulu, y el de 2025
 * salia el 9 en Honolulu y el 10 en el resto del mundo. Un seminario ocurre donde ocurre;
 * la fecha no puede depender de desde donde se lea.
 *
 * El huso se lee en cada llamada y no se guarda en un formateador de modulo: se fija al
 * cargar los ajustes, despues de que este fichero se importe.
 */

function formato(opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(LOCALE, {
    ...opciones,
    timeZone: husoDelSitioActual(),
  })
}

const dia = (fecha: Date) =>
  formato({ day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)

/**
 * La hora, con el nombre del huso detras.
 *
 * El nombre importa: se pedia la hora al minuto, se guardaba, y no se ensenaba en ninguna
 * parte del sitio. Ahora se ensena, y sin decir de que reloj es, «9:00 am» no le sirve de
 * nada a quien se conecta desde otro continente.
 */
const hora = (fecha: Date) =>
  formato({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(
    fecha
  )

/**
 * "12 March 2026, 9:00 am AEDT", o "12 March — 14 March 2026".
 *
 * La hora solo cuando el evento cabe en un dia. En uno de varios, lo que se quiere saber
 * es que dias ocupa; anadirle dos horas lo alarga sin decir mas.
 */
export function rangoDeFechas(
  event: Pick<PublicEvent, 'startsAt' | 'endsAt'>
): string {
  const inicio = new Date(event.startsAt)
  const fin = event.endsAt === null ? null : new Date(event.endsAt)

  if (fin !== null && dia(fin) !== dia(inicio))
    return `${dia(inicio)} — ${dia(fin)}`
  return `${dia(inicio)}, ${hora(inicio)}`
}
