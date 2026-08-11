import { ValidationError } from '../../shared/errors/AppError.js'

/** Invariantes de publicacion de un trabajo (ERS §15, RN-002, RN-003). */

export const ANIO_MINIMO = 1800
/** ERS §15: hasta el ano actual mas cinco, para admitir "forthcoming". */
export const ANIOS_FUTUROS_PERMITIDOS = 5

export function assertPublicationYearInRange(anio: number | null | undefined, hoy: Date): void {
  if (anio === null || anio === undefined) return

  const maximo = hoy.getUTCFullYear() + ANIOS_FUTUROS_PERMITIDOS
  if (anio < ANIO_MINIMO || anio > maximo) {
    throw new ValidationError(
      `The publication year must be between ${ANIO_MINIMO} and ${maximo}.`,
      { publicationYear: `Out of range (${ANIO_MINIMO}-${maximo}).` },
      'WORK_INVALID_PUBLICATION_YEAR',
    )
  }
}

/**
 * RN-002: un trabajo debe tener al menos un autor antes de publicarse.
 *
 * Se comprueba al publicar y no al crear: un borrador sin autores todavia es un
 * borrador util, pero una publicacion sin autoria no significa nada academicamente.
 */
/**
 * Un trabajo apunta a una ficha de publicacion O guarda su nombre suelto, nunca las dos
 * cosas.
 *
 * Con las dos, los dos nombres pueden acabar diciendo cosas distintas y no habria forma
 * de saber cual manda: el listado mostraria uno y la busqueda encontraria el otro.
 */
export function assertVenueIsEitherLinkedOrTyped(entrada: {
  venueId?: string | null | undefined
  venueName?: string | null | undefined
}): void {
  const tieneFicha = entrada.venueId !== null && entrada.venueId !== undefined
  const tieneTexto =
    entrada.venueName !== null && entrada.venueName !== undefined && entrada.venueName.trim() !== ''

  if (tieneFicha && tieneTexto) {
    throw new ValidationError(
      'A work links to a venue or names one as free text, not both.',
      { venueId: 'Remove the free-text name, or unlink the venue.' },
      'WORK_VENUE_CONFLICT',
    )
  }
}

export function assertCanBePublished(estado: { authorCount: number }): void {
  if (estado.authorCount < 1) {
    throw new ValidationError(
      'The work must have at least one author before it can be published.',
      { authors: 'At least one author is required.' },
      'WORK_VALIDATION_ERROR',
    )
  }
}

/** RN-003: un trabajo destacado debe estar publicado. */
export function assertCanBeInCarousel(estado: { editorialStatus: string }): void {
  if (estado.editorialStatus !== 'published') {
    throw new ValidationError(
      'Only published works can appear in the home carousel.',
      { isCarousel: 'The work must be published first.' },
      'WORK_CAROUSEL_REQUIRES_PUBLISHED',
    )
  }
}

export function assertCanBeFeatured(estado: { editorialStatus: string }): void {
  if (estado.editorialStatus !== 'published') {
    throw new ValidationError(
      'Only published works can be featured on the home page.',
      { isFeatured: 'The work must be published first.' },
      'WORK_FEATURED_REQUIRES_PUBLISHED',
    )
  }
}

/**
 * Archivar un trabajo destacado lo retira de Home: mantener destacado algo archivado
 * dejaria RN-003 rota. El caso de uso limpia la marca en lugar de rechazar la accion.
 */
export function featuredStateAfterUnpublish(): {
  isFeatured: false
  featuredOrder: null
  isCarousel: false
  carouselOrder: null
} {
  // El carrusel va con lo mismo: un trabajo archivado no puede seguir encabezando la
  // portada, por la misma razon por la que no puede seguir destacado.
  return { isFeatured: false, featuredOrder: null, isCarousel: false, carouselOrder: null }
}

/** El orden de autoria es 1..N, sin huecos ni repeticiones (ERS §16). */
export function assertAuthorOrderIsContiguous(orders: number[]): void {
  if (orders.length === 0) return

  const ordenado = [...orders].sort((a, b) => a - b)
  const esperado = ordenado.every((valor, indice) => valor === indice + 1)

  if (!esperado) {
    throw new ValidationError(
      'Author order must be a contiguous sequence starting at 1.',
      { authors: 'Invalid author order.' },
      'WORK_INVALID_AUTHOR_ORDER',
    )
  }
}
