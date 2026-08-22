import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type {
  CourseOfferingRecord,
  CourseRecord,
  CourseRepository,
} from '../../ports/repositories/CourseRepository.js'
import type { InstitutionsRepository } from '../../ports/repositories/InstitutionsRepository.js'
import { CourseUseCases } from './CourseUseCases.js'

const UNSW = { id: 'inst-unsw', institutionId: 'inst-unsw' }
const OTRA = { id: 'inst-otra' }
const DEP_UNSW = { id: 'dep-unsw', institutionId: UNSW.id }
const DEP_OTRA = { id: 'dep-otra', institutionId: OTRA.id }

function curso(parcial: Partial<CourseRecord> = {}): CourseRecord {
  return {
    id: 'c1',
    title: 'Intermediate Microeconomics',
    shortTitle: null,
    slug: 'intermediate-microeconomics',
    defaultCode: null,
    level: null,
    summary: null,
    descriptionMarkdown: null,
    coverMediaId: null,
    externalUrl: null,
    editorialStatus: 'published',
    isFeatured: false,
    featuredOrder: null,
    displayOrder: null,
    publishedAt: null,
    tags: [],
    offerings: [],
    ...parcial,
  }
}

function edicion(parcial: Partial<CourseOfferingRecord> = {}): CourseOfferingRecord {
  return {
    id: 'o1',
    courseId: 'c1',
    institutionId: UNSW.id,
    institutionName: 'UNSW',
    departmentId: DEP_UNSW.id,
    departmentName: 'Economics',
    name: null,
    courseCode: null,
    term: 'Semester 1',
    academicYear: 2025,
    startDate: null,
    endDate: null,
    teachingRole: 'Lecturer',
    summary: null,
    contentMarkdown: null,
    isActive: true,
    editorialStatus: 'draft',
    sortOrder: null,
    teachers: [],
    materials: [],
    ...parcial,
  }
}

function construir(opciones: { curso?: CourseRecord; edicion?: CourseOfferingRecord } = {}) {
  const cursoActual = opciones.curso ?? curso()
  const edicionActual = opciones.edicion ?? edicion()
  const cursosCreados: unknown[] = []
  const edicionesActualizadas: Array<Record<string, unknown>> = []
  const estadosDeCurso: Array<{ status: string; extra: Record<string, unknown> }> = []
  const materiales = new Map([['m1', { id: 'm1', mediaId: 'media-1', externalUrl: null } as never]])

  const repo = {
    findById: () => Promise.resolve(cursoActual),
    findOffering: () => Promise.resolve(edicionActual),
    findMaterial: (id: string) => Promise.resolve(materiales.get(id) ?? null),
    slugExists: () => Promise.resolve(false),
    create: (input: unknown) => {
      cursosCreados.push(input)
      return Promise.resolve(cursoActual)
    },
    updateOffering: (_id: string, input: Record<string, unknown>) => {
      edicionesActualizadas.push(input)
      return Promise.resolve({ ...edicionActual, ...input })
    },
    setOfferingEditorialStatus: (_id: string, status: string) =>
      Promise.resolve({ ...edicionActual, editorialStatus: status }),
    setEditorialStatus: (_id: string, status: string, extra: Record<string, unknown>) => {
      estadosDeCurso.push({ status, extra })
      return Promise.resolve({ ...cursoActual, editorialStatus: status })
    },
    updateMaterial: (_id: string, input: unknown) => Promise.resolve(input as never),
  } as unknown as CourseRepository

  const instituciones = {
    findInstitution: (id: string) =>
      Promise.resolve(id === UNSW.id || id === OTRA.id ? { id } : null),
    findDepartment: (id: string) =>
      Promise.resolve(id === DEP_UNSW.id ? DEP_UNSW : id === DEP_OTRA.id ? DEP_OTRA : null),
  } as unknown as InstitutionsRepository

  const audit: AuditLogger = { record: vi.fn().mockResolvedValue(undefined) }

  return {
    casos: new CourseUseCases(repo, instituciones, audit),
    cursosCreados,
    edicionesActualizadas,
    estadosDeCurso,
  }
}

describe('archivar un curso', () => {
  it('no menciona la fecha de publicacion, y por eso no la borra', async () => {
    // Un curso archiva OMITIENDO el campo: lo que no va en `extra` no llega al UPDATE y
    // la columna se queda como estaba. Los eventos archivan de otra forma —pasan la
    // fecha que ya tenian— y durante un tiempo pasaron `null`, que la borraba. Las dos
    // formas son correctas; lo que no vale es mezclarlas.
    const { casos, estadosDeCurso } = construir({ curso: curso({ editorialStatus: 'published' }) })

    await casos.archive('c1', { userId: 'u1', ipAddress: null })

    expect(estadosDeCurso[0]?.status).toBe('archived')
    expect(Object.keys(estadosDeCurso[0]?.extra ?? {})).not.toContain('publishedAt')
  })
})

describe('ERS §2.4: la edicion cambia de institucion sin duplicar el curso', () => {
  it('mover una edicion a otra institucion es una edicion normal', async () => {
    const { casos, edicionesActualizadas, cursosCreados } = construir()

    await casos.updateOffering('o1', { institutionId: OTRA.id, departmentId: null })

    expect(edicionesActualizadas[0]).toMatchObject({ institutionId: OTRA.id })
    // Lo esencial: no se crea un curso nuevo. Con institution_id en `courses` habria
    // que duplicarlo, que es justo lo que el ERS §2.4 evita.
    expect(cursosCreados).toHaveLength(0)
  })

  it('RN-006 sigue aplicando: departamento de otra institucion da 422', async () => {
    const { casos, edicionesActualizadas } = construir()

    await expect(
      casos.updateOffering('o1', { institutionId: OTRA.id, departmentId: DEP_UNSW.id }),
    ).rejects.toMatchObject({ httpStatus: 422, code: 'DEPARTMENT_INSTITUTION_MISMATCH' })

    expect(edicionesActualizadas).toHaveLength(0)
  })

  it('un PATCH que solo cambia la institucion valida el par resultante', async () => {
    // La edicion ya tiene DEP_UNSW; mover solo la institucion la dejaria incoherente.
    const { casos } = construir()

    await expect(casos.updateOffering('o1', { institutionId: OTRA.id })).rejects.toMatchObject({
      code: 'DEPARTMENT_INSTITUTION_MISMATCH',
    })
  })
})

describe('RN-005: publicar una edicion', () => {
  it('publica si el curso esta publicado', async () => {
    const { casos } = construir()
    await expect(casos.publishOffering('o1')).resolves.toMatchObject({
      editorialStatus: 'published',
    })
  })

  it('rechaza si el curso esta archivado', async () => {
    const { casos } = construir({ curso: curso({ editorialStatus: 'archived' }) })

    await expect(casos.publishOffering('o1')).rejects.toMatchObject({
      code: 'OFFERING_COURSE_ARCHIVED',
    })
  })

  it('rechaza si el curso sigue en borrador', async () => {
    const { casos } = construir({ curso: curso({ editorialStatus: 'draft' }) })

    await expect(casos.publishOffering('o1')).rejects.toMatchObject({
      code: 'OFFERING_COURSE_NOT_PUBLISHED',
    })
  })
})

describe('ERS §24: XOR del material al actualizar', () => {
  it('anadir un enlace a un material que ya tiene archivo da 422', async () => {
    const { casos } = construir()

    // El material m1 ya tiene mediaId; el PATCH solo envia externalUrl, pero lo que
    // se valida es el resultado, no lo enviado.
    await expect(
      casos.updateMaterial('m1', { externalUrl: 'https://x.test/s.pdf' }),
    ).rejects.toMatchObject({ code: 'MATERIAL_SOURCE_CONFLICT' })
  })

  it('sustituir el archivo por un enlace en el mismo PATCH si vale', async () => {
    const { casos } = construir()

    await expect(
      casos.updateMaterial('m1', { mediaId: null, externalUrl: 'https://x.test/s.pdf' }),
    ).resolves.toBeDefined()
  })
})
