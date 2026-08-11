import { describe, expect, it } from 'vitest'
import {
  assertDepartmentBelongsToInstitution,
  assertDepartmentCanBeDeleted,
  assertDepartmentCanChangeInstitution,
  assertInstitutionCanBeDeleted,
  assertPersonCanBeDeleted,
} from './rules.js'

const UNSW = 'inst-unsw'
const OTRA = 'inst-otra'

describe('RN-006: el departamento pertenece a la institucion', () => {
  it('acepta que no se asigne departamento', () => {
    expect(() => {
      assertDepartmentBelongsToInstitution({
        departmentId: null,
        departmentInstitutionId: null,
        institutionId: UNSW,
      })
    }).not.toThrow()
  })

  it('acepta un departamento de la misma institucion', () => {
    expect(() => {
      assertDepartmentBelongsToInstitution({
        departmentId: 'dep-economics',
        departmentInstitutionId: UNSW,
        institutionId: UNSW,
      })
    }).not.toThrow()
  })

  it('rechaza con 422 un departamento de otra institucion', () => {
    expect(() =>
      assertDepartmentBelongsToInstitution({
        departmentId: 'dep-de-otra',
        departmentInstitutionId: OTRA,
        institutionId: UNSW,
      }),
    ).toThrowError(
      expect.objectContaining({ httpStatus: 422, code: 'DEPARTMENT_INSTITUTION_MISMATCH' }),
    )
  })

  it('distingue un departamento inexistente de uno de otra institucion', () => {
    expect(() =>
      assertDepartmentBelongsToInstitution({
        departmentId: 'dep-fantasma',
        departmentInstitutionId: null,
        institutionId: UNSW,
      }),
    ).toThrowError(expect.objectContaining({ code: 'DEPARTMENT_NOT_FOUND' }))
  })
})

describe('RN-007: no borrar instituciones referenciadas', () => {
  it('permite borrar una institucion sin usos', () => {
    expect(() => {
      assertInstitutionCanBeDeleted({ departments: 0, affiliations: 0, courseOfferings: 0 })
    }).not.toThrow()
  })

  it('rechaza con 409 y enumera los usos', () => {
    expect(() =>
      assertInstitutionCanBeDeleted({ departments: 2, affiliations: 0, courseOfferings: 3 }),
    ).toThrowError(expect.objectContaining({ httpStatus: 409, code: 'INSTITUTION_IN_USE' }))
  })

  it('el mensaje nombra solo los usos que existen', () => {
    try {
      assertInstitutionCanBeDeleted({ departments: 0, affiliations: 1, courseOfferings: 0 })
      expect.unreachable('deberia haber lanzado')
    } catch (error) {
      expect((error as Error).message).toContain('1 afiliaciones')
      expect((error as Error).message).not.toContain('departamentos')
    }
  })

  it('rechaza borrar un departamento en uso', () => {
    expect(() =>
      assertDepartmentCanBeDeleted({ affiliations: 0, courseOfferings: 1 }),
    ).toThrowError(expect.objectContaining({ code: 'DEPARTMENT_IN_USE' }))
  })
})

describe('RN-008: no borrar personas referenciadas', () => {
  it('permite borrar un coautor sin trabajos ni afiliaciones', () => {
    expect(() => {
      assertPersonCanBeDeleted({
        publishedAuthorships: 0,
        totalAuthorships: 0,
        affiliations: 0,
        isSiteOwner: false,
      })
    }).not.toThrow()
  })

  it('nunca permite borrar al propietario del sitio', () => {
    expect(() =>
      assertPersonCanBeDeleted({
        publishedAuthorships: 0,
        totalAuthorships: 0,
        affiliations: 0,
        isSiteOwner: true,
      }),
    ).toThrowError(expect.objectContaining({ code: 'PERSON_IS_SITE_OWNER' }))
  })

  it('rechaza a un autor de trabajos publicados', () => {
    expect(() =>
      assertPersonCanBeDeleted({
        publishedAuthorships: 3,
        totalAuthorships: 5,
        affiliations: 0,
        isSiteOwner: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'PERSON_HAS_PUBLISHED_WORKS' }))
  })

  it('rechaza a un autor de borradores, con un codigo distinto', () => {
    expect(() =>
      assertPersonCanBeDeleted({
        publishedAuthorships: 0,
        totalAuthorships: 2,
        affiliations: 0,
        isSiteOwner: false,
      }),
    ).toThrowError(expect.objectContaining({ code: 'PERSON_IN_USE' }))
  })
})

describe('mover un departamento de institucion', () => {
  it('se permite si no cuelga nada de el', () => {
    expect(() => {
      assertDepartmentCanChangeInstitution({ affiliations: 0, courseOfferings: 0 })
    }).not.toThrow()
  })

  /**
   * La clave foranea compuesta es ON UPDATE CASCADE: mover el departamento moveria
   * tambien la institucion de cada afiliacion. Comprobado contra la base de datos:
   * sin esta regla, una persona afiliada a "Casa A / Depto X" pasaba a estarlo a
   * "Casa B / Depto X" sin que nadie lo pidiera.
   */
  it('se rechaza con 409 si hay afiliaciones que se moverian con el', () => {
    expect(() => {
      assertDepartmentCanChangeInstitution({ affiliations: 1, courseOfferings: 0 })
    }).toThrow(expect.objectContaining({ httpStatus: 409, code: 'DEPARTMENT_HAS_DEPENDENTS' }))
  })

  it('tambien si lo que cuelga son ediciones de curso', () => {
    expect(() => {
      assertDepartmentCanChangeInstitution({ affiliations: 0, courseOfferings: 3 })
    }).toThrow(expect.objectContaining({ code: 'DEPARTMENT_HAS_DEPENDENTS' }))
  })
})
