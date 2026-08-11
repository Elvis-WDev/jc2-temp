/**
 * El idioma con el que se escriben fechas y numeros.
 *
 * Un solo sitio para cambiarlo. `en-AU` y no `en-US` porque el dia va antes que el mes
 * —"11 Aug 2026"—, que es como lo lee el publico de este sitio; y porque la zona horaria
 * configurada es `Australia/Sydney`.
 *
 * No se usa el idioma del navegador. Antes se hacia, y la agenda salia en castellano
 * ("14 de diciembre de 2026") dentro de una pagina escrita entera en ingles: el idioma de
 * una interfaz lo decide la interfaz, no quien la visita.
 */
export const LOCALE = 'en-AU'
