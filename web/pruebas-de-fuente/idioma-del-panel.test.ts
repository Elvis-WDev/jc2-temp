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

/**
 * Palabras que no existen en ingles: su presencia delata una cadena sin traducir.
 *
 * La lista no se adivina, se amplia cuando algo se escapa. La primera version dejo
 * pasar once cadenas —«Admite Markdown.», «Opcional.», «merece ficha propia»— porque
 * ninguna de sus palabras estaba aqui. Si aparece otra, se añade.
 */
const CASTELLANO =
  /\b(Ocultar|Mostrar|Guardar|Cancelar|Buscar|Crear|Editar|Borrar|Eliminar|Cerrar|Subir|Bajar|Descargar|Publicar|Archivar|Limpiar|Anterior|Siguiente|Volumen|Numero|Subtitulo|Codigo|Elegir|Descargable|Archivo|Nombre|Titulo|Fecha|Ninguno|Ninguna|actualizado|creado|Pegalo|Inscribirse|Admite|Opcional|merece|ficha|propia|propio|delante|detras|materiales|enciende|apaga|cuenta|servidor|sesion|disponible|momento|bloque|vacio|vacia|borrador|etiquetas|enlaces|imagenes|paginas|Continuar|Aceptar|Aplicar|Volver|Añadir|Anadir|Quitar)\b/

function ficheros(directorio: string): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return ficheros(ruta)
    return /\.tsx?$/.test(entrada) && !ruta.includes('.test.') ? [ruta] : []
  })
}

/** Fuera los comentarios: van en castellano a proposito. */
function sinComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/.*$/gm, '')
}

/**
 * Lo que el usuario llega a leer, con su linea.
 *
 * Tres formas: cadenas entre comillas, texto suelto en su propia linea, y texto entre
 * etiquetas. Esta ultima **puede ocupar varias lineas** —prettier parte los parrafos
 * largos— y mirarlas de una en una es como se colaron «merece ficha propia» y
 * «https://doi.org/ delante»: cada trozo por separado parecia ingles.
 *
 * Se descartan las claves y rutas —`work_link`, `/admin/works`— y las clases de estilo,
 * que van entrecomilladas pero nadie las lee.
 */
function textoVisible(codigo: string): Array<{ linea: number; texto: string }> {
  const limpio = sinComentarios(codigo)
  const trozos: Array<{ inicio: number; texto: string }> = []

  for (const m of limpio.matchAll(/'([^'\\\n]{3,200})'/g))
    trozos.push({ inicio: m.index, texto: m[1] ?? '' })

  // Sin `{}` dentro: asi no se traga codigo JSX entero, solo texto literal.
  for (const m of limpio.matchAll(/>([^<>{}]{3,300})</g))
    trozos.push({ inicio: m.index, texto: m[1] ?? '' })

  for (const m of limpio.matchAll(/^[ \t]*([A-Z][^<>{}'"\n]{3,200})$/gm))
    trozos.push({ inicio: m.index, texto: m[1] ?? '' })

  return trozos
    // Los parrafos partidos vuelven a ser una sola frase antes de mirarlos.
    .map(({ inicio, texto }) => ({
      linea: limpio.slice(0, inicio).split('\n').length,
      texto: texto.split(/\s+/).join(' ').trim(),
    }))
    .filter(
      ({ texto }) =>
        texto.length >= 3 &&
        !/^[a-z0-9_@./:*-]+$/.test(texto) &&
        !texto.includes('className')
    )
}

describe('el idioma del panel', () => {
  it('no queda ni un rotulo en castellano', () => {
    const sospechas: string[] = []

    for (const ruta of [
      ...ficheros('src/features'),
      ...ficheros('src/components'),
    ]) {
      for (const { linea, texto } of textoVisible(readFileSync(ruta, 'utf8'))) {
        if (CASTELLANO.test(texto)) {
          sospechas.push(`${ruta}:${String(linea)}  ${texto.slice(0, 60)}`)
        }
      }
    }

    expect(sospechas).toEqual([])
  })
})
