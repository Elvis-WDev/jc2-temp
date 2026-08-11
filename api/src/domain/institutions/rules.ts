import { ConflictError, ValidationError } from '../../shared/errors/AppError.js'

/**
 * Reglas de negocio de instituciones, departamentos y afiliaciones.
 *
 * Viven en el dominio y no en el controlador: las comparten el alta de una edicion
 * de curso, el alta de una afiliacion y cualquier importador futuro. Escritas en el
 * controlador, habria que reimplementarlas en cada sitio y una acabaria divergiendo.
 *
 * La base de datos las respalda ademas con una clave foranea compuesta (ver la
 * migracion inicial), asi que ni un script de mantenimiento podria saltarselas.
 */

/**
 * RN-006 y ERS §13: si se asigna un departamento, debe pertenecer a la institucion
 * seleccionada.
 *
 * `departmentInstitutionId` es null cuando el departamento no existe; se distingue
 * de "existe pero es de otra institucion" porque el mensaje util es distinto.
 */
export function assertDepartmentBelongsToInstitution(params: {
  departmentId: string | null | undefined
  departmentInstitutionId: string | null
  institutionId: string
}): void {
  if (params.departmentId === null || params.departmentId === undefined) return

  if (params.departmentInstitutionId === null) {
    throw new ValidationError(
      'The selected department does not exist.',
      { departmentId: 'Unknown department.' },
      'DEPARTMENT_NOT_FOUND',
    )
  }

  if (params.departmentInstitutionId !== params.institutionId) {
    throw new ValidationError(
      'The selected department belongs to a different institution.',
      { departmentId: 'This department is not part of the selected institution.' },
      'DEPARTMENT_INSTITUTION_MISMATCH',
    )
  }
}

/**
 * RN-007: una institucion referenciada no se borra fisicamente. La alternativa que
 * ofrece el ERS es desactivarla (`is_active = false`), que conserva el historico.
 */
export function assertInstitutionCanBeDeleted(usos: {
  departments: number
  affiliations: number
  courseOfferings: number
}): void {
  const total = usos.departments + usos.affiliations + usos.courseOfferings
  if (total === 0) return

  const detalle = [
    usos.departments > 0 ? `${usos.departments} departamentos` : null,
    usos.affiliations > 0 ? `${usos.affiliations} afiliaciones` : null,
    usos.courseOfferings > 0 ? `${usos.courseOfferings} ediciones de curso` : null,
  ]
    .filter((parte): parte is string => parte !== null)
    .join(', ')

  throw new ConflictError(
    `The institution is referenced by ${detalle}. Deactivate it instead of deleting it.`,
    'INSTITUTION_IN_USE',
  )
}

/** RN-007 aplicado al departamento. */
export function assertDepartmentCanBeDeleted(usos: {
  affiliations: number
  courseOfferings: number
}): void {
  const total = usos.affiliations + usos.courseOfferings
  if (total === 0) return

  throw new ConflictError(
    'The department is referenced by existing affiliations or course offerings. Deactivate it instead of deleting it.',
    'DEPARTMENT_IN_USE',
  )
}

/**
 * Un departamento con gente o cursos dentro no cambia de institucion.
 *
 * La clave foranea compuesta que respalda RN-006 es ON UPDATE CASCADE, asi que mover el
 * departamento arrastra consigo la institucion de cada afiliacion y de cada edicion de
 * curso que cuelgue de el. Sin esta comprobacion, corregir una errata en el formulario
 * reescribiria en silencio donde ha trabajado una persona.
 *
 * Se corta aqui y no en el formulario porque el panel no es el unico cliente.
 */
export function assertDepartmentCanChangeInstitution(usos: {
  affiliations: number
  courseOfferings: number
}): void {
  const total = usos.affiliations + usos.courseOfferings
  if (total === 0) return

  throw new ConflictError(
    'The department cannot be moved to another institution while affiliations or course offerings depend on it, because they would be moved with it. Detach them first, or create a new department.',
    'DEPARTMENT_HAS_DEPENDENTS',
  )
}

/**
 * RN-008: no se borra una persona que figura como autor de trabajos publicados.
 *
 * Se comprueban tambien las afiliaciones y la propiedad del sitio: borrar al
 * propietario dejaria `site_settings` sin destino de su clave foranea.
 */
export function assertPersonCanBeDeleted(usos: {
  publishedAuthorships: number
  totalAuthorships: number
  affiliations: number
  isSiteOwner: boolean
}): void {
  if (usos.isSiteOwner) {
    throw new ConflictError('The site owner cannot be deleted.', 'PERSON_IS_SITE_OWNER')
  }

  if (usos.publishedAuthorships > 0) {
    throw new ConflictError(
      `The person is an author on ${usos.publishedAuthorships} published works.`,
      'PERSON_HAS_PUBLISHED_WORKS',
    )
  }

  if (usos.totalAuthorships > 0 || usos.affiliations > 0) {
    throw new ConflictError(
      'The person is referenced by works or affiliations. Detach those references first.',
      'PERSON_IN_USE',
    )
  }
}
