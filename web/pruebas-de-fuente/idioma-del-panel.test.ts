import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El panel y el sitio publico estan escritos en ingles.
 *
 * Habia 61 rotulos y mensajes en castellano repartidos por trece modulos, y en el mismo
 * formulario convivian «Title» y «Subtitulo», «Pages» y «Volumen». No era un detalle de
 * estilo: el ojo cambiaba de idioma cada dos campos, y eso era la mitad de por que
 * costaba leer el panel.
 *
 * Mira el texto que ve el usuario, no los comentarios: **esos siguen en castellano a
 * proposito**, que es la convencion del repositorio y no los lee nadie desde la
 * aplicacion.
 *
 * Vive fuera de `src` porque corre en Node y no en el navegador: lee el codigo fuente en
 * disco. `tsconfig.app.json` es configuracion de navegador y no trae los tipos de Node,
 * asi que meterla ahi obligaria a añadirlos al codigo de la aplicacion y a perder el
 * aviso cuando alguien use `process` en una pantalla.
 */

/** Palabras que no existen en ingles: su presencia delata una cadena sin traducir. */
const CASTELLANO =
  /\b(Ocultar|Mostrar|Guardar|Cancelar|Buscar|Crear|Editar|Borrar|Eliminar|Cerrar|Subir|Bajar|Descargar|Publicar|Archivar|Limpiar|Anterior|Siguiente|Volumen|Numero|Subtitulo|Codigo|Elegir|Descargable|Archivo|Nombre|Titulo|Fecha|Ninguno|Ninguna|actualizado|creado|Pegalo|Inscribirse)\b/

function esComentario(linea: string): boolean {
  const limpia = linea.trim()
  return (
    limpia.startsWith('//') || limpia.startsWith('*') || limpia.startsWith('/*')
  )
}

function ficheros(directorio: string): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return ficheros(ruta)
    return /\.tsx?$/.test(entrada) && !ruta.includes('.test.') ? [ruta] : []
  })
}

/**
 * Lo que el usuario llega a leer.
 *
 * Tres formas: cadenas entre comillas, texto suelto en su propia linea, y texto entre
 * etiquetas en la misma linea. La tercera falta la primera vez y dejaba pasar
 * `<FormLabel>Subtitulo</FormLabel>` entero, que es justo la forma mas comun de un
 * rotulo.
 *
 * Se descartan las claves y rutas —`work_link`, `/admin/works`— y las clases de estilo,
 * que van entrecomilladas pero nadie las lee.
 */
function textoVisible(linea: string): string[] {
  const entrecomillado = [...linea.matchAll(/'([^'\\]{3,120})'/g)].map(
    (m) => m[1] ?? ''
  )
  const entreEtiquetas = [...linea.matchAll(/>([^<>{}]{3,120})</g)].map(
    (m) => m[1] ?? ''
  )
  const suelto = /^[A-Z][^<>{}'"]{3,120}$/.test(linea.trim())
    ? [linea.trim()]
    : []

  return [...entrecomillado, ...entreEtiquetas, ...suelto]
    .map((texto) => texto.trim())
    .filter(
      (texto) =>
        !/^[a-z0-9_@./:*-]+$/.test(texto) && !texto.includes('className')
    )
}


describe('el idioma del panel', () => {
  it('no queda ni un rotulo en castellano', () => {
    const sospechas: string[] = []

    for (const ruta of [
      ...ficheros('src/features'),
      ...ficheros('src/components'),
    ]) {
      readFileSync(ruta, 'utf8')
        .split('\n')
        .forEach((linea, indice) => {
          if (esComentario(linea)) return
          for (const texto of textoVisible(linea)) {
            if (CASTELLANO.test(texto)) {
              sospechas.push(
                `${ruta}:${String(indice + 1)}  ${texto.slice(0, 60)}`
              )
            }
          }
        })
    }

    expect(sospechas).toEqual([])
  })
})
