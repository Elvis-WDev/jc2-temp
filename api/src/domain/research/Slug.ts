import slugify from 'slugify'
import { esColisionDeUnico } from '../../shared/errors/uniqueViolation.js'

/**
 * RN-010: los slugs son unicos y estables.
 *
 * Cambiar el titulo NO modifica un slug ya publicado. Un slug publicado puede estar
 * en un enlace externo, en una cita o en el indice de un buscador; regenerarlo al
 * corregir una errata romperia todo eso en silencio.
 */

export function generateSlug(titulo: string): string {
  return slugify(titulo, { lower: true, strict: true, trim: true }).slice(0, 200)
}

/** Anade un sufijo numerico para resolver colisiones: `mi-titulo-2`. */
export function withSuffix(slugBase: string, intento: number): string {
  return intento <= 1 ? slugBase : `${slugBase.slice(0, 195)}-${intento}`
}

/**
 * Decide el slug al actualizar.
 *
 * Solo se regenera si el trabajo sigue en borrador y no se fijo uno a mano. En cuanto
 * hay un slug publicado, se conserva pase lo que pase con el titulo.
 */
export function resolveSlugOnUpdate(params: {
  slugActual: string
  slugSolicitado?: string | undefined
  tituloNuevo?: string | undefined
  yaPublicado: boolean
}): string {
  if (params.slugSolicitado !== undefined && params.slugSolicitado !== '') {
    return generateSlug(params.slugSolicitado)
  }

  if (params.yaPublicado) return params.slugActual

  if (params.tituloNuevo !== undefined && params.tituloNuevo !== '') {
    return generateSlug(params.tituloNuevo)
  }

  return params.slugActual
}

/** Intentos maximos para desambiguar un slug antes de rendirse. */
export const MAX_INTENTOS_SLUG = 50

/**
 * Escribe la fila buscando un slug libre, y reintenta si otro se lo lleva por delante.
 *
 * Preguntar "existe este slug?" y despues insertar deja un hueco entre las dos cosas. Con
 * dos altas simultaneas del mismo titulo, las dos veian el slug libre y la segunda moria
 * contra la restriccion unica de la base: un 409 en algo que el titular tiene todo el
 * derecho a hacer dos veces. La restriccion sigue ahi —es la que garantiza que no haya
 * duplicados—, pero ahora su rechazo no acaba en la cara de nadie: se toma como "este ya
 * no vale" y se prueba el siguiente sufijo.
 *
 * `agotado` decide que pasa cuando ni 50 sufijos bastan, porque no todos opinan igual:
 * un trabajo prefiere un sufijo raro antes que fallar, y un evento prefiere fallar.
 */
export async function escribirConSlugLibre<T>(params: {
  base: string
  exceptId?: string | undefined
  existe: (slug: string, exceptId?: string) => Promise<boolean>
  escribir: (slug: string) => Promise<T>
  agotado: () => Promise<T>
}): Promise<T> {
  for (let intento = 1; intento <= MAX_INTENTOS_SLUG; intento += 1) {
    const candidato = withSuffix(params.base, intento)
    if (await params.existe(candidato, params.exceptId)) continue

    try {
      return await params.escribir(candidato)
    } catch (error) {
      // Solo el choque de slug se reintenta. Cualquier otro fallo es del que llama.
      if (!esColisionDeUnico(error, 'slug')) throw error
    }
  }

  return params.agotado()
}
