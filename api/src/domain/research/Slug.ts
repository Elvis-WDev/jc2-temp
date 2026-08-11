import slugify from 'slugify'

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
