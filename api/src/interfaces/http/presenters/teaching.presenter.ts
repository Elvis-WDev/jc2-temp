import type {
  CourseOfferingRecord,
  CourseRecord,
} from '../../../application/ports/repositories/CourseRepository.js'
import type { PublicCourseSummary } from '../../../application/ports/repositories/PublicCourseRepository.js'
import type { PublicCourseDetail } from '../../../application/use-cases/teaching/PublicTeachingUseCases.js'
import { renderMarkdown } from '../../../shared/markdown/render.js'
import { toCalendarDate } from '../schemas/common.schemas.js'

/**
 * Capa 3 del blindaje. Nunca sale `editorialStatus`, `displayOrder`, `featuredOrder`
 * ni identificadores de media en crudo.
 */

export function toPublicCourseSummaryDto(curso: PublicCourseSummary) {
  return {
    id: curso.id,
    slug: curso.slug,
    title: curso.title,
    shortTitle: curso.shortTitle,
    level: curso.level,
    code: curso.code,
    summary: curso.summary,
    tags: curso.tags,
    currentOffering: curso.currentOffering,
    offeringCount: curso.offeringCount,
  }
}

export function toPublicCourseDetailDto(detalle: PublicCourseDetail, baseUrl: string) {
  const curso = detalle.course

  return {
    id: curso.id,
    slug: curso.slug,
    title: curso.title,
    shortTitle: curso.shortTitle,
    code: curso.defaultCode,
    externalUrl: curso.externalUrl,
    level: curso.level,
    summary: curso.summary,
    descriptionHtml: renderMarkdown(curso.descriptionMarkdown),
    coverUrl:
      curso.coverMediaId === null ? null : `${baseUrl}/api/public/media/${curso.coverMediaId}`,
    tags: curso.tags.map((tag) => ({ slug: tag.slug, name: tag.name })),
    offerings: curso.offerings.map((edicion) => ({
      id: edicion.id,
      name: edicion.name,
      institution: edicion.institutionName,
      department: edicion.departmentName,
      code: edicion.courseCode,
      term: edicion.term,
      academicYear: edicion.academicYear,
      startDate: edicion.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: edicion.endDate?.toISOString().slice(0, 10) ?? null,
      role: edicion.teachingRole,
      teachers: edicion.teachers.map((docente) => ({
        name: docente.fullName,
        role: docente.role,
      })),
      isActive: edicion.isActive,
      summary: edicion.summary,
      contentHtml: renderMarkdown(edicion.contentMarkdown),
      // El repositorio publico ya excluye los materiales privados.
      materials: edicion.materials.map((material) => ({
        type: material.materialType,
        // El nombre del catalogo, no el codigo interno.
        typeLabel: detalle.materialTypeLabels[material.materialType] ?? material.materialType,
        title: material.title,
        description: material.description,
        // Un material tiene archivo O enlace, nunca ambos (ERS §24).
        url:
          material.mediaId === null
            ? material.externalUrl
            : `${baseUrl}/api/public/media/${material.mediaId}`,
        isExternal: material.mediaId === null,
      })),
    })),
  }
}

/**
 * Curso para el panel, con todo lo que el editor necesita: estado, orden y los
 * identificadores de las relaciones.
 *
 * Existe sobre todo por las fechas. El registro las lleva como `Date` y sin este paso
 * salian como instante ISO completo, mientras que al guardar se espera el dia. Un
 * formulario que cargara una edicion y la volviera a guardar sin tocarla mandaria un
 * formato distinto del que recibio.
 */
export function toAdminOfferingDto(edicion: CourseOfferingRecord) {
  return {
    id: edicion.id,
    courseId: edicion.courseId,
    institutionId: edicion.institutionId,
    institutionName: edicion.institutionName,
    departmentId: edicion.departmentId,
    departmentName: edicion.departmentName,
    name: edicion.name,
    courseCode: edicion.courseCode,
    term: edicion.term,
    academicYear: edicion.academicYear,
    startDate: toCalendarDate(edicion.startDate),
    endDate: toCalendarDate(edicion.endDate),
    teachingRole: edicion.teachingRole,
    summary: edicion.summary,
    contentMarkdown: edicion.contentMarkdown,
    isActive: edicion.isActive,
    editorialStatus: edicion.editorialStatus,
    sortOrder: edicion.sortOrder,
    teachers: edicion.teachers,
    materials: edicion.materials,
  }
}

export function toAdminCourseDto(curso: CourseRecord) {
  return {
    id: curso.id,
    title: curso.title,
    shortTitle: curso.shortTitle,
    slug: curso.slug,
    defaultCode: curso.defaultCode,
    level: curso.level,
    summary: curso.summary,
    descriptionMarkdown: curso.descriptionMarkdown,
    coverMediaId: curso.coverMediaId,
    externalUrl: curso.externalUrl,
    editorialStatus: curso.editorialStatus,
    isFeatured: curso.isFeatured,
    featuredOrder: curso.featuredOrder,
    displayOrder: curso.displayOrder,
    publishedAt: curso.publishedAt === null ? null : curso.publishedAt.toISOString(),
    tags: curso.tags,
    offerings: curso.offerings.map(toAdminOfferingDto),
  }
}
