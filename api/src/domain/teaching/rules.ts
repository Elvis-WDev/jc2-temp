import { ValidationError } from '../../shared/errors/AppError.js'

/**
 * Reglas de Teaching.
 *
 * La decision estructural (ERS §2.4, §21, §60.8) es que `Course` NO conoce
 * institucion ni ano: eso vive en `CourseOffering`. Por eso aqui no hay ninguna regla
 * que relacione un curso con una institucion; la coherencia
 * institucion-departamento la aporta `domain/institutions/rules.ts`, compartida con
 * las afiliaciones.
 */

/**
 * RN-005: una edicion no puede publicarse si su curso esta archivado.
 *
 * Publicarla dejaria una edicion visible colgando de un curso que el administrador
 * decidio retirar, y RN-001 dejaria de significar lo mismo segun por donde se mire.
 */
export function assertOfferingCanBePublished(estado: { courseEditorialStatus: string }): void {
  if (estado.courseEditorialStatus === 'archived') {
    throw new ValidationError(
      'The course is archived. Restore the course before publishing this offering.',
      { courseId: 'The parent course is archived.' },
      'OFFERING_COURSE_ARCHIVED',
    )
  }

  if (estado.courseEditorialStatus === 'draft') {
    throw new ValidationError(
      'The course is still a draft. Publish the course before publishing this offering.',
      { courseId: 'The parent course is not published.' },
      'OFFERING_COURSE_NOT_PUBLISHED',
    )
  }
}

/** RN-004: un curso destacado debe estar publicado. */
export function assertCourseCanBeFeatured(estado: { editorialStatus: string }): void {
  if (estado.editorialStatus !== 'published') {
    throw new ValidationError(
      'Only published courses can be featured on the home page.',
      { isFeatured: 'The course must be published first.' },
      'COURSE_FEATURED_REQUIRES_PUBLISHED',
    )
  }
}

/**
 * ERS §24: un material tiene archivo interno O enlace externo, nunca ambos ni
 * ninguno.
 *
 * La base de datos lo respalda con un CHECK, pero el error de PostgreSQL no le dice
 * nada util a quien rellena el formulario.
 */
export function assertMaterialSourceIsExclusive(material: {
  mediaId: string | null | undefined
  externalUrl: string | null | undefined
}): void {
  const tieneArchivo = material.mediaId !== null && material.mediaId !== undefined
  const tieneEnlace =
    material.externalUrl !== null &&
    material.externalUrl !== undefined &&
    material.externalUrl !== ''

  if (tieneArchivo && tieneEnlace) {
    throw new ValidationError(
      'A material has either an uploaded file or an external link, not both.',
      { mediaId: 'Choose a file or a link, not both.' },
      'MATERIAL_SOURCE_CONFLICT',
    )
  }

  if (!tieneArchivo && !tieneEnlace) {
    throw new ValidationError(
      'A material needs either an uploaded file or an external link.',
      { mediaId: 'Provide a file or a link.' },
      'MATERIAL_SOURCE_MISSING',
    )
  }
}

/**
 * Un curso archivado arrastra sus ediciones fuera de la vista publica y pierde el
 * destacado, por la misma razon que en Research: no dejar RN-004 rota en silencio.
 */
export function courseStateAfterArchive(): { isFeatured: false; featuredOrder: null } {
  return { isFeatured: false, featuredOrder: null }
}
