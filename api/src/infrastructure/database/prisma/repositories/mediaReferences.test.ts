import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Cada sitio del modelo que apunta a un archivo tiene que estar contemplado en las dos
 * funciones que deciden su destino: `countReferences`, que impide borrarlo mientras se
 * use, e `isPubliclyReachable`, que decide si se sirve sin sesion.
 *
 * Esto no lo cazaba nada. La imagen de un evento faltaba en las dos: la agenda entregaba
 * su direccion y la descarga respondia 404, asi que el hueco se pintaba vacio en
 * produccion. Y borrar ese archivo habria devuelto un error crudo de Postgres en lugar
 * de `MEDIA_IN_USE`.
 *
 * La lista de relaciones sale del propio esquema, asi que anadir un campo de archivo
 * nuevo rompe esta prueba hasta que se decida que hacer con el en cada funcion. Que es
 * exactamente lo que se quiere: obligar a la decision, no confiar en recordarla.
 */

const RAIZ = new URL('../../../../../', import.meta.url).pathname

const ESQUEMA = readFileSync(`${RAIZ}prisma/schema.prisma`, 'utf8')
const REPOSITORIO = readFileSync(
  `${RAIZ}src/infrastructure/database/prisma/repositories/PrismaMediaRepository.ts`,
  'utf8',
)

/**
 * Cada columna que apunta a `MediaAsset`, como `SiteSettings.footerMediaId`.
 *
 * Por columna y no por modelo: mirando solo el modelo, anadir un archivo a uno que ya
 * tenia otro se colaba. Paso de verdad con la imagen del pie —`SiteSettings` ya estaba
 * en la lista por el emblema y por la de OpenGraph— y la prueba no dijo nada.
 */
function camposDeArchivo(): string[] {
  const campos = new Set<string>()
  for (const coincidencia of ESQUEMA.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) {
    const modelo = coincidencia[1] ?? ''
    if (modelo === 'MediaAsset') continue
    for (const linea of (coincidencia[2] ?? '').split('\n')) {
      // `photoMediaId String? @map("photo_media_id") @db.Uuid`, y tambien los
      // obligatorios como `WorkFile.mediaId`, que no llevan interrogacion.
      const campo = /^\s+(\w*[Mm]ediaId)\s+String\??\s/.exec(linea)?.[1]
      if (campo !== undefined) campos.add(`${modelo}.${campo}`)
    }
  }
  return [...campos].sort()
}

/** Los modelos que apuntan a `MediaAsset`, deducidos de sus columnas. */
function modelosConArchivo(): string[] {
  return [...new Set(camposDeArchivo().map(modeloDe))].sort()
}

/** El cuerpo de una funcion del repositorio, para mirar que consulta. */
function cuerpo(nombre: string): string {
  const patron = new RegExp(`async ${nombre}\\([\\s\\S]*?\\n  \\}`)
  const encontrado = patron.exec(REPOSITORIO)?.[0]
  if (encontrado === undefined) throw new Error(`No se encontro ${nombre}`)
  return encontrado
}

/** `SiteSettings.footerMediaId` -> `SiteSettings`. */
function modeloDe(campo: string): string {
  return campo.slice(0, campo.indexOf('.'))
}

/** `SiteSettings.footerMediaId` -> `footerMediaId`. */
function columna(campo: string): string {
  return campo.slice(campo.indexOf('.') + 1)
}

/** `Person` -> `prisma.person.count`. */
function consulta(modelo: string): string {
  return `prisma.${modelo.charAt(0).toLowerCase()}${modelo.slice(1)}.count`
}

/**
 * Lo que no se sirve en publico, y por que.
 *
 * No es una excepcion para hacer pasar la prueba: es la lista de campos de archivo que
 * el sitio publico no entrega. Si algun dia uno de estos se publica, hay que sacarlo de
 * aqui y contemplarlo en `isPubliclyReachable`.
 */
const NO_SE_SIRVEN_EN_PUBLICO: Record<string, string> = {
  // El sitio pinta los iconos con su propio juego (Lucide) y solo usa `iconKey`, que es
  // un nombre, no un archivo. El icono subido no llega a salir nunca.
  PersonLink: 'el sitio usa iconKey, no el archivo',
}

describe('referencias a archivos', () => {
  it('el esquema declara las relaciones que se esperan', () => {
    expect(modelosConArchivo()).toEqual([
      'Course',
      'CourseMaterial',
      'Event',
      'Institution',
      'PageContent',
      'PageSection',
      'Person',
      'PersonLink',
      'Post',
      'PostFile',
      'SiteSettings',
      'Work',
      'WorkFile',
    ])
  })

  it('countReferences mira TODOS los sitios: si no, se borra un archivo en uso', () => {
    const texto = cuerpo('countReferences')
    const faltan = modelosConArchivo().filter((m) => !texto.includes(consulta(m)))

    expect(faltan).toEqual([])
  })

  it('isPubliclyReachable mira todos los que el sitio publico entrega', () => {
    const texto = cuerpo('isPubliclyReachable')
    const faltan = modelosConArchivo()
      .filter((m) => !(m in NO_SE_SIRVEN_EN_PUBLICO))
      .filter((m) => !texto.includes(consulta(m)))

    expect(faltan).toEqual([])
  })

  it('countReferences nombra cada columna, no solo cada modelo', () => {
    // Un modelo puede tener dos archivos —`SiteSettings` tiene tres— y mirar solo el
    // modelo dejaba pasar el segundo.
    const texto = cuerpo('countReferences')
    const faltan = camposDeArchivo().filter((campo) => !texto.includes(columna(campo)))

    expect(faltan).toEqual([])
  })

  it('isPubliclyReachable nombra cada columna que el sitio entrega', () => {
    const texto = cuerpo('isPubliclyReachable')
    const faltan = camposDeArchivo()
      .filter((campo) => !(modeloDe(campo) in NO_SE_SIRVEN_EN_PUBLICO))
      .filter((campo) => !texto.includes(columna(campo)))

    expect(faltan).toEqual([])
  })
})
