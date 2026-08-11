import { toast } from 'sonner'
import { ApiError, toApiError } from '@/lib/api/api-error'

/**
 * Mensajes por codigo de error de la API.
 *
 * El backend ya devuelve un `message` correcto; esto lo reescribe para que diga que
 * hacer a continuacion, no solo que ha pasado. Un codigo sin entrada aqui cae al
 * mensaje del servidor, que nunca es peor que un generico.
 */
const MENSAJES: Record<string, string> = {
  UNAUTHORIZED: 'Your session has expired. Sign in again.',
  ACCOUNT_DISABLED: 'This account is disabled.',
  ADMIN_ROLE_REQUIRED: 'You do not have administrator permissions.',
  LOGIN_RATE_LIMITED: 'Too many attempts. Wait a moment before trying again.',
  RATE_LIMITED: 'Too many requests. Wait a moment.',
  NETWORK_ERROR: 'The server could not be reached.',

  ALREADY_EXISTS: 'That identifier is already in use. Choose another one.',
  CITATION_STYLE_IN_USE:
    'There are citations written in that style. Hide it instead.',
  CITATION_STYLE_CODE_TAKEN: 'A style with that code already exists.',
  CITATION_STYLE_NOT_FOUND: 'That citation style does not exist.',
  EVENT_NOT_FOUND: 'That event does not exist.',
  EVENT_DATES_REVERSED: 'The event ends before it starts.',
  VENUE_NAME_TAKEN: 'You already have a venue with that name.',
  VENUE_IN_USE: 'Some work cites this venue. Hide it instead.',
  WORK_VENUE_CONFLICT:
    'Choose a venue from your list or type a loose name, not both.',
  ACADEMIC_STATUS_IN_USE: 'Some work uses this status. Hide it instead.',
  ACADEMIC_STATUS_NOT_FOUND: 'That academic status does not exist.',
  ACADEMIC_STATUS_CODE_TAKEN: 'A status with that code already exists.',
  CATALOG_TERM_IN_USE: 'Some record uses this term. Hide it instead.',
  CATALOG_TERM_CODE_TAKEN: 'A term with that code already exists in this list.',
  TAG_ALREADY_EXISTS: 'An equivalent tag already exists.',
  TAG_IN_USE: 'The tag is in use.',
  WORK_TYPE_CODE_TAKEN: 'That work type code already exists.',
  WORK_TYPE_IN_USE: 'Some works use this type.',
  INSTITUTION_IN_USE: 'The institution is referenced elsewhere.',
  DEPARTMENT_IN_USE: 'The department is referenced elsewhere.',
  PERSON_IS_SITE_OWNER: 'The site owner cannot be deleted.',
  PERSON_HAS_PUBLISHED_WORKS: 'This person authored published work.',
  MEDIA_IN_USE: 'The file is in use.',
  MEDIA_TYPE_NOT_ALLOWED: 'That file type is not accepted for this purpose.',
  MEDIA_EXTENSION_NOT_ALLOWED:
    'That extension is not accepted for this purpose.',
  MEDIA_TYPE_NOT_RECOGNISED: 'The contents of the file were not recognised.',
  MEDIA_TOO_LARGE: 'The file is over the maximum size.',
  DEPARTMENT_INSTITUTION_MISMATCH:
    'The department does not belong to that institution.',
  DEPARTMENT_HAS_DEPENDENTS:
    'The institution cannot be changed: everyone affiliated with the department would move with it.',
  OFFERING_COURSE_ARCHIVED:
    'The course is archived; restore it before publishing.',
  OFFERING_COURSE_NOT_PUBLISHED: 'Publish the course first.',
  MATERIAL_SOURCE_CONFLICT: 'A material has a file or a link, not both.',
  MATERIAL_SOURCE_MISSING: 'The material needs a file or a link.',
}

export function handleServerError(error: unknown) {
  const apiError = error instanceof ApiError ? error : toApiError(error)

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(apiError.code, apiError)
  }

  // Un 500 no trae detalle util: el backend devuelve texto generico y guarda la traza
  // real bajo este identificador. Mostrarlo es lo unico que permite dar soporte.
  if (apiError.isUnexpected) {
    toast.error('Unexpected server error.', {
      description: apiError.requestId
        ? `Reference: ${apiError.requestId}`
        : undefined,
    })
    return
  }

  // Si el error es de campos concretos, el formulario ya los pinta junto a cada uno:
  // repetirlo en un toast seria ruido duplicado.
  if (apiError.hasFieldErrors) return

  toast.error(MENSAJES[apiError.code] ?? apiError.message)
}
