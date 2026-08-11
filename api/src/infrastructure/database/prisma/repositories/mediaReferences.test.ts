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

/** Los modelos que apuntan a `MediaAsset`, leidos de sus relaciones inversas. */
function modelosConArchivo(): string[] {
  const bloque = /model MediaAsset \{([\s\S]*?)\n\}/.exec(ESQUEMA)?.[1]
  if (bloque === undefined) throw new Error('No se encontro el modelo MediaAsset')

  const modelos = new Set<string>()
  for (const linea of bloque.split('\n')) {
    const modelo = /^\s+\w+\s+(\w+)\[\]/.exec(linea)?.[1]
    if (modelo !== undefined) modelos.add(modelo)
  }
  return [...modelos].sort()
}

/** El cuerpo de una funcion del repositorio, para mirar que consulta. */
function cuerpo(nombre: string): string {
  const patron = new RegExp(`async ${nombre}\\([\\s\\S]*?\\n  \\}`)
  const encontrado = patron.exec(REPOSITORIO)?.[0]
  if (encontrado === undefined) throw new Error(`No se encontro ${nombre}`)
  return encontrado
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
})
