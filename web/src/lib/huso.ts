/**
 * El reloj del sitio.
 *
 * Un evento ocurre en un sitio, no en el navegador de quien lo lee. La agenda escribia
 * las fechas con el huso del visitante y el mismo festival salia **el 15 de diciembre en
 * Sydney, el 14 en Madrid y el 14 en Honolulu**; el de 2025 salia el 9 en Honolulu y el
 * 10 en el resto. Aqui vive el huso con el que se escriben y se leen todas las fechas de
 * contenido, para que digan lo mismo desde donde sea.
 *
 * `site_settings.timezone` lleva desde el principio guardado y editandose en el panel sin
 * que nadie lo leyera. Ahora lo lee esto.
 *
 * **Es una variable de modulo y no una prop.** Se leen fechas en seis sitios del sitio
 * publico y en dos del panel, y pasarla a mano por todos ellos significa que basta
 * olvidarse en uno para que el fallo siga vivo justo ahi. Se fija una vez al cargar y no
 * vuelve a cambiar.
 */

/**
 * Hasta que la API conteste.
 *
 * Con `undefined` se usaria el huso del navegador, que es exactamente el fallo, y durante
 * el primer instante de cada carga se veria la fecha equivocada. Es el mismo motivo por
 * el que `LOCALE` esta escrito a mano en `locale.ts`.
 */
const POR_DEFECTO = 'Australia/Sydney'

let husoDelSitio = POR_DEFECTO

/** Lo llama quien carga los ajustes: la capa del sitio publico y la del panel. */
export function fijarHusoDelSitio(zona: string | null | undefined): void {
  if (zona === null || zona === undefined || zona.trim() === '') return
  // Un huso invalido dejaria a `Intl` lanzando en cada fecha de la pagina.
  try {
    new Intl.DateTimeFormat('en', { timeZone: zona }).format()
    husoDelSitio = zona
  } catch {
    husoDelSitio = POR_DEFECTO
  }
}

export function husoDelSitioActual(): string {
  return husoDelSitio
}

/** Solo para las pruebas: devuelve el modulo a como estaba. */
export function reiniciarHusoDelSitio(): void {
  husoDelSitio = POR_DEFECTO
}

/**
 * Un instante, escrito como lo espera `datetime-local`, con el reloj del sitio.
 *
 * Antes se escribia con el del navegador: el titular tecleaba 9:30 en Sydney, y al abrir
 * el mismo evento desde otro sitio veia 17:30 del dia anterior.
 */
export function aHoraDelSitio(iso: string | null): string {
  if (iso === null || iso === '') return ''

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: husoDelSitio,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))

  const de = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '00'

  // A medianoche, `hour12: false` puede dar "24" en lugar de "00" segun el motor.
  const hora = de('hour') === '24' ? '00' : de('hour')
  return `${de('year')}-${de('month')}-${de('day')}T${hora}:${de('minute')}`
}

/**
 * Y la vuelta: lo que se teclea en el sitio, convertido al instante que le corresponde.
 *
 * No hay forma directa de decirle a `Date` «esto son las 9:30 en Sydney», asi que se
 * mide: se interpreta el texto como si fuera UTC, se mira que hora marca ese instante en
 * el huso del sitio, y la diferencia es el desfase que hay que aplicar. Se repite una vez
 * porque en el salto de horario de primavera el desfase de partida puede ser el del otro
 * lado del cambio.
 */
export function desdeHoraDelSitio(local: string): Date {
  if (local === '') return new Date(NaN)

  let instante = new Date(`${local}:00Z`)
  for (let vuelta = 0; vuelta < 2; vuelta += 1) {
    const marcado = aHoraDelSitio(instante.toISOString())
    const desfase =
      new Date(`${local}:00Z`).getTime() - new Date(`${marcado}:00Z`).getTime()
    if (desfase === 0) break
    instante = new Date(instante.getTime() + desfase)
  }
  return instante
}
