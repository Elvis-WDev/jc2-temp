import type { CourseRecord } from '../../../../application/ports/repositories/CourseRepository.js'
import type {
  PublicCourseRepository,
  PublicCourseSummary,
  PublicTeachingFilters,
  TeachingFacets,
} from '../../../../application/ports/repositories/PublicCourseRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'
import { mapCourse } from './courseMapper.js'
import { matchIdOrSlug } from '../../../../shared/uuid.js'

/** Garantia de RN-001 para cursos, incrustada en todas las consultas de esta clase. */
const SOLO_CURSOS_PUBLICADOS = { editorialStatus: 'published' } as const

/**
 * Una edicion visible necesita estar publicada ella misma. Un curso publicado puede
 * tener ediciones en borrador que no deben verse (ERS §23).
 */
const SOLO_EDICIONES_PUBLICADAS = { editorialStatus: 'published' } as const

const SELECT_RESUMEN = {
  id: true,
  slug: true,
  title: true,
  shortTitle: true,
  level: true,
  defaultCode: true,
  summary: true,
  tags: { select: { tag: { select: { slug: true, name: true } } } },
  offerings: {
    where: SOLO_EDICIONES_PUBLICADAS,
    orderBy: [{ isActive: 'desc' }, { academicYear: 'desc' }],
    select: {
      isActive: true,
      courseCode: true,
      term: true,
      academicYear: true,
      teachingRole: true,
      institution: { select: { name: true } },
      department: { select: { name: true } },
    },
  },
} satisfies Prisma.CourseSelect

type FilaResumen = {
  id: string
  slug: string
  title: string
  shortTitle: string | null
  level: string | null
  defaultCode: string | null
  summary: string | null
  tags: Array<{ tag: { slug: string; name: string } }>
  offerings: Array<{
    isActive: boolean
    courseCode: string | null
    term: string | null
    academicYear: number | null
    teachingRole: string | null
    institution: { name: string }
    department: { name: string } | null
  }>
}

function mapResumen(fila: FilaResumen): PublicCourseSummary {
  // El orderBy pone primero la activa; si no hay ninguna, la mas reciente.
  const actual = fila.offerings[0] ?? null

  return {
    id: fila.id,
    slug: fila.slug,
    title: fila.title,
    shortTitle: fila.shortTitle,
    level: fila.level,
    code: actual?.courseCode ?? fila.defaultCode,
    summary: fila.summary,
    tags: fila.tags.map((relacion) => relacion.tag),
    currentOffering:
      actual === null
        ? null
        : {
            institution: actual.institution.name,
            department: actual.department?.name ?? null,
            term: actual.term,
            academicYear: actual.academicYear,
            teachingRole: actual.teachingRole,
            isActive: actual.isActive,
          },
    offeringCount: fila.offerings.length,
  }
}

export class PrismaPublicCourseRepository implements PublicCourseRepository {
  /**
   * Los filtros de institucion, departamento y "solo activos" se aplican sobre las
   * ediciones PUBLICADAS: filtrar sobre todas dejaria aparecer un curso por una
   * edicion en borrador que el visitante no puede ver.
   */
  private construirWhere(filtros: PublicTeachingFilters): Prisma.CourseWhereInput {
    const condicionesEdicion: Prisma.CourseOfferingWhereInput = {
      ...SOLO_EDICIONES_PUBLICADAS,
      ...(filtros.institution === null ? {} : { institution: { slug: filtros.institution } }),
      ...(filtros.department === null ? {} : { departmentId: filtros.department }),
      ...(filtros.activeOnly ? { isActive: true } : {}),
    }

    const texto = filtros.q === null || filtros.q.trim() === '' ? null : filtros.q.trim()

    return {
      ...SOLO_CURSOS_PUBLICADOS,
      offerings: { some: condicionesEdicion },
      ...(filtros.tag === null ? {} : { tags: { some: { tag: { slug: filtros.tag } } } }),
      ...(texto === null
        ? {}
        : {
            // ERS §46: titulo, resumen, descripcion, institucion, departamento y tags.
            OR: [
              { title: { contains: texto, mode: 'insensitive' } },
              { shortTitle: { contains: texto, mode: 'insensitive' } },
              { summary: { contains: texto, mode: 'insensitive' } },
              { descriptionMarkdown: { contains: texto, mode: 'insensitive' } },
              { tags: { some: { tag: { name: { contains: texto, mode: 'insensitive' } } } } },
              {
                offerings: {
                  some: {
                    ...condicionesEdicion,
                    OR: [
                      { institution: { name: { contains: texto, mode: 'insensitive' } } },
                      { department: { name: { contains: texto, mode: 'insensitive' } } },
                    ],
                  },
                },
              },
            ],
          }),
    }
  }

  async list(
    query: PaginationQuery,
    filtros: PublicTeachingFilters,
  ): Promise<{ items: PublicCourseSummary[]; totalItems: number }> {
    const where = this.construirWhere(filtros)
    const { skip, take } = toSkipTake(query)

    const orderBy: Prisma.CourseOrderByWithRelationInput[] =
      filtros.sort === 'title'
        ? [{ title: 'asc' }]
        : [{ displayOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]

    const [filas, totalItems] = await Promise.all([
      prisma.course.findMany({ where, skip, take, orderBy, select: SELECT_RESUMEN }),
      prisma.course.count({ where }),
    ])

    return { items: filas.map(mapResumen), totalItems }
  }

  async facets(filtros: PublicTeachingFilters): Promise<TeachingFacets> {
    const where = this.construirWhere(filtros)

    // Las facets se calculan sobre las ediciones publicadas de los cursos que ya pasan
    // el filtro, para que los recuentos cuadren con la lista.
    const ediciones = await prisma.courseOffering.findMany({
      where: { ...SOLO_EDICIONES_PUBLICADAS, course: where },
      select: {
        institution: { select: { slug: true, name: true } },
        department: { select: { id: true, name: true } },
        courseId: true,
      },
    })

    const porInstitucion = new Map<string, { slug: string; name: string; cursos: Set<string> }>()
    const porDepartamento = new Map<
      string,
      { id: string; name: string; institution: string; cursos: Set<string> }
    >()

    for (const edicion of ediciones) {
      const inst = porInstitucion.get(edicion.institution.slug) ?? {
        slug: edicion.institution.slug,
        name: edicion.institution.name,
        cursos: new Set<string>(),
      }
      inst.cursos.add(edicion.courseId)
      porInstitucion.set(edicion.institution.slug, inst)

      if (edicion.department !== null) {
        const dep = porDepartamento.get(edicion.department.id) ?? {
          id: edicion.department.id,
          name: edicion.department.name,
          institution: edicion.institution.name,
          cursos: new Set<string>(),
        }
        dep.cursos.add(edicion.courseId)
        porDepartamento.set(edicion.department.id, dep)
      }
    }

    // Niveles: se agrupan los cursos que ya pasan el filtro y se resuelve cada valor
    // contra el catalogo. Se piden tambien los terminos ocultos, para que un nivel que
    // el titular oculto despues siga saliendo con su nombre y no con su codigo.
    const [porNivel, terminosDeNivel] = await Promise.all([
      prisma.course.groupBy({ by: ['level'], where, _count: { _all: true } }),
      prisma.catalogTerm.findMany({
        where: { catalog: 'course_level' },
        select: { code: true, label: true, description: true, sortOrder: true },
      }),
    ])

    const catalogoDeNivel = new Map(terminosDeNivel.map((termino) => [termino.code, termino]))

    const porTag = await prisma.courseTag.groupBy({
      by: ['tagId'],
      where: { course: where },
      _count: { _all: true },
    })

    const tags = await prisma.tag.findMany({
      where: { id: { in: porTag.map((fila) => fila.tagId) } },
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    })
    const cuentaTag = new Map(porTag.map((fila) => [fila.tagId, fila._count._all]))

    return {
      levels: porNivel
        .filter((fila): fila is typeof fila & { level: string } => fila.level !== null)
        .map((fila) => {
          const termino = catalogoDeNivel.get(fila.level)
          return {
            code: fila.level,
            // Sin termino en el catalogo se muestra el valor tal cual, que es mejor
            // que esconder el curso o ensenar un hueco.
            label: termino?.label ?? fila.level,
            description: termino?.description ?? null,
            // Los que no estan en el catalogo van al final, en orden alfabetico.
            sortOrder: termino?.sortOrder ?? Number.MAX_SAFE_INTEGER,
            count: fila._count._all,
          }
        })
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
      institutions: [...porInstitucion.values()]
        .map((inst) => ({ slug: inst.slug, name: inst.name, count: inst.cursos.size }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      departments: [...porDepartamento.values()]
        .map((dep) => ({
          id: dep.id,
          name: dep.name,
          institution: dep.institution,
          count: dep.cursos.size,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      tags: tags.map((tag) => ({
        slug: tag.slug,
        name: tag.name,
        count: cuentaTag.get(tag.id) ?? 0,
      })),
    }
  }

  async findPublished(idOrSlug: string): Promise<CourseRecord | null> {
    const fila = await prisma.course.findFirst({
      where: { ...SOLO_CURSOS_PUBLICADOS, OR: matchIdOrSlug(idOrSlug) },
      include: {
        tags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
        offerings: {
          // Ni las ediciones en borrador ni los materiales privados salen de la base
          // de datos: no dependen de que el presenter se acuerde de filtrarlos.
          where: SOLO_EDICIONES_PUBLICADAS,
          orderBy: [{ academicYear: 'desc' }, { sortOrder: 'asc' }],
          include: {
            institution: { select: { name: true, slug: true } },
            department: { select: { name: true } },
            teachers: {
              orderBy: { sortOrder: 'asc' },
              include: { person: { select: { fullName: true } } },
            },
            materials: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    })

    return fila === null ? null : mapCourse(fila)
  }
}
