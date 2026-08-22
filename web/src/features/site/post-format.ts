import { husoDelSitioActual } from '@/lib/huso'
import { LOCALE } from '@/lib/locale'

/**
 * La fecha en que salio, escrita para leerse.
 *
 * `published_at` es un instante y la web ensena un dia: quien lee una noticia no
 * necesita la hora, y darsela solo anade ruido.
 *
 * Se escribe con el reloj del sitio, igual que la agenda. Una entrada publicada a las
 * 22:30 de un lunes en Sydney cambiaba de dia para media Europa.
 */
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'long',
    timeZone: husoDelSitioActual(),
  }).format(new Date(iso))
}
