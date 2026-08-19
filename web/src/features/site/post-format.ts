import { LOCALE } from '@/lib/locale'

/**
 * La fecha en que salio, escrita para leerse.
 *
 * `published_at` es un instante y la web ensena un dia: quien lee una noticia no
 * necesita la hora, y darsela solo anade ruido.
 */
const LARGA = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long' })

export function fechaLarga(iso: string): string {
  return LARGA.format(new Date(iso))
}
