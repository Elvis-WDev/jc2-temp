import { describe, expect, it } from 'vitest'
import type {
  DepartmentRecord,
  InstitutionRecord,
  InstitutionsRepository,
} from '../../ports/repositories/InstitutionsRepository.js'
import type {
  AffiliationRecord,
  PeopleRepository,
} from '../../ports/repositories/PeopleRepository.js'
import { InstitutionUseCases } from '../institutions/InstitutionUseCases.js'
import { AffiliationUseCases } from './AffiliationUseCases.js'

/**
 * Los puertos hacen que estas pruebas no necesiten ni base de datos ni HTTP: se
 * inyectan repositorios en memoria y se comprueba la regla de negocio directamente.
 */

const UNSW: InstitutionRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'UNSW',
  shortName: 'UNSW',
  slug: 'unsw',
  websiteUrl: null,
  countryCode: 'AU',
  city: 'Sydney',
  logoMediaId: null,
  description: null,
  brandColor: null,
  sortOrder: 0,
  isActive: true,
}

const OTRA: InstitutionRecord = {
  ...UNSW,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'University X',
  slug: 'university-x',
}

const ECONOMICS: DepartmentRecord = {
  id: '33333333-3333-4333-8333-333333333333',
  institutionId: UNSW.id,
  institutionName: UNSW.name,
  name: 'School of Economics',
  shortName: null,
  slug: 'economics',
  websiteUrl: null,
  descriptionMarkdown: null,
  sortOrder: 0,
  isActive: true,
}

/** Departamento que pertenece a OTRA institucion: el caso que RN-006 debe cortar. */
const AJENO: DepartmentRecord = {
  ...ECONOMICS,
  id: '44444444-4444-4444-8444-444444444444',
  institutionId: OTRA.id,
  institutionName: OTRA.name,
  name: 'Department of Physics',
}

/**
 * Registra que identificadores de departamento se han ido a buscar. Un `Map` devuelve
 * `undefined` sin quejarse ante cualquier clave, asi que solo comprobar el resultado
 * dejaria pasar una busqueda de departamento con el identificador vacio; contra Prisma
 * eso es un error 500. Por eso se vigilan las llamadas, no solo lo que devuelven.
 */
const buscados: unknown[] = []

function repoInstituciones(usos = { departments: 0, affiliations: 0, courseOfferings: 0 }) {
  buscados.length = 0

  const instituciones = new Map([
    [UNSW.id, UNSW],
    [OTRA.id, OTRA],
  ])
  const departamentos = new Map([
    [ECONOMICS.id, ECONOMICS],
    [AJENO.id, AJENO],
  ])

  return {
    findInstitution: (id: string) => Promise.resolve(instituciones.get(id) ?? null),
    findDepartment: (id: string) => {
      buscados.push(id)
      return Promise.resolve(departamentos.get(id) ?? null)
    },
    countInstitutionUsage: () => Promise.resolve(usos),
    deleteInstitution: (id: string) => {
      instituciones.delete(id)
      return Promise.resolve()
    },
    updateInstitution: (id: string, input: Partial<InstitutionRecord>) =>
      Promise.resolve({ ...(instituciones.get(id) as InstitutionRecord), ...input }),
  } as unknown as InstitutionsRepository
}

function repoPersonas() {
  const creadas: AffiliationRecord[] = []
  return {
    creadas,
    repo: {
      createAffiliation: (input: Omit<AffiliationRecord, 'id'>) => {
        const fila = { ...input, id: 'af-1' }
        creadas.push(fila)
        return Promise.resolve(fila)
      },
    } as unknown as PeopleRepository,
  }
}

const BASE = {
  personId: '55555555-5555-4555-8555-555555555555',
  title: 'Professor',
  affiliationType: null,
  startDate: null,
  endDate: null,
  isPrimary: true,
  isCurrent: true,
  descriptionMarkdown: null,
  sortOrder: 0,
}

describe('RN-006 al crear una afiliacion', () => {
  it('acepta un departamento de la misma institucion', async () => {
    const { repo, creadas } = repoPersonas()
    const casos = new AffiliationUseCases(repo, repoInstituciones())

    await casos.create({ ...BASE, institutionId: UNSW.id, departmentId: ECONOMICS.id })

    expect(creadas).toHaveLength(1)
  })

  it('acepta que no se indique departamento', async () => {
    const { repo, creadas } = repoPersonas()
    const casos = new AffiliationUseCases(repo, repoInstituciones())

    await casos.create({ ...BASE, institutionId: UNSW.id, departmentId: null })

    expect(creadas).toHaveLength(1)
    expect(buscados).toEqual([])
  })

  // El formulario puede omitir el campo en lugar de enviarlo vacio. Los dos casos
  // significan lo mismo y ninguno debe acabar buscando un departamento.
  it('acepta que el campo departamento ni siquiera venga', async () => {
    const { repo, creadas } = repoPersonas()
    const casos = new AffiliationUseCases(repo, repoInstituciones())

    await casos.create({ ...BASE, institutionId: UNSW.id } as Parameters<typeof casos.create>[0])

    expect(creadas).toHaveLength(1)
    expect(buscados).toEqual([])
  })

  it('rechaza con 422 un departamento de otra institucion', async () => {
    const { repo, creadas } = repoPersonas()
    const casos = new AffiliationUseCases(repo, repoInstituciones())

    await expect(
      casos.create({ ...BASE, institutionId: UNSW.id, departmentId: AJENO.id }),
    ).rejects.toMatchObject({ httpStatus: 422, code: 'DEPARTMENT_INSTITUTION_MISMATCH' })

    // Nada llega a la base de datos: se corta antes de escribir.
    expect(creadas).toHaveLength(0)
  })

  it('rechaza una institucion inexistente antes de mirar el departamento', async () => {
    const { repo } = repoPersonas()
    const casos = new AffiliationUseCases(repo, repoInstituciones())

    await expect(
      casos.create({ ...BASE, institutionId: 'no-existe', departmentId: ECONOMICS.id }),
    ).rejects.toMatchObject({ code: 'INSTITUTION_NOT_FOUND' })
  })
})

describe('RN-007 al borrar una institucion', () => {
  it('borra una institucion sin referencias', async () => {
    const casos = new InstitutionUseCases(repoInstituciones())
    await expect(casos.delete(UNSW.id)).resolves.toBeUndefined()
  })

  it('rechaza con 409 una institucion con ediciones de curso', async () => {
    const casos = new InstitutionUseCases(
      repoInstituciones({ departments: 0, affiliations: 0, courseOfferings: 4 }),
    )

    await expect(casos.delete(UNSW.id)).rejects.toMatchObject({
      httpStatus: 409,
      code: 'INSTITUTION_IN_USE',
    })
  })

  it('desactivar siempre es posible, aunque este referenciada', async () => {
    const casos = new InstitutionUseCases(
      repoInstituciones({ departments: 3, affiliations: 2, courseOfferings: 1 }),
    )

    await expect(casos.deactivate(UNSW.id)).resolves.toMatchObject({ isActive: false })
  })
})
