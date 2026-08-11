/**
 * Saneado de nombres de archivo para la cabecera Content-Disposition.
 *
 * Vive en `shared` porque lo necesita la capa HTTP y las reglas de frontera le
 * impiden importar infraestructura.
 */

const ULTIMO_CODIGO_DE_CONTROL = 31
const CODIGO_DEL = 127
const LONGITUD_MAXIMA = 200

function esCaracterDeControl(caracter: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0
  return codigo <= ULTIMO_CODIGO_DE_CONTROL || codigo === CODIGO_DEL
}

/**
 * Los caracteres de control permitirian inyectar cabeceras HTTP (un CR LF corta la
 * cabecera y empieza otra), y los separadores de ruta sugeririan al cliente una
 * ubicacion real del servidor.
 */
export function sanitizeDownloadFilename(nombre: string): string {
  const limpio = [...nombre]
    .filter((caracter) => !esCaracterDeControl(caracter))
    .join('')
    .replace(/[/\\]/g, '_')
    // Despues de sustituir los separadores se descarta el prefijo de puntos y
    // guiones bajos que dejaba un "../../": seria seguro igualmente, pero ilegible.
    .replace(/^[._]+/, '')
    .trim()

  return limpio.length > 0 ? limpio.slice(0, LONGITUD_MAXIMA) : 'download'
}
