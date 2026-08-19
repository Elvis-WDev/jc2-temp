import { assertDepartmentBelongsToInstitution } from '../../../domain/institutions/rules.js'
import {
  escribirConSlugLibre,
  generateSlug,
  resolveSlugOnUpdate,
} from '../../../domain/research/Slug.js'
import {
  assertCourseCanBeFeatured,
  assertMaterialSourceIsExclusive,
  assertOfferingCanBePublished,
  courseStateAfterArchive,
} from '../../../domain/teaching/rules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { AuditLogger } from '../../ports/AuditLogger.js'
import type { InstitutionsRepository } from '../../ports/repositories/InstitutionsRepository.js'
import type {
  CourseMaterialInput,
  CourseMaterialRecord,
  CourseOfferingRecord,
  CourseOfferingWriteInput,
  CourseRecord,
  CourseRepository,
  CourseWriteInput,
} from '../../ports/repositories/CourseRepository.js'

export interface TeachingActor {
  userId: string | null
  ipAddress: string | null
}

/**
 * Casos de uso administrativos de Teaching (ERS §21-24).
 *
 * El curso no sabe nada de instituciones: crear un curso solo pide titulo y
 * metadatos academicos. La institucion entra al crear una edicion.
 */
export class CourseUseCases {
  constructor(
    private readonly repo: CourseRepository,
    private readonly institutions: InstitutionsRepository,
    private readonly audit: AuditLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<Paginated<CourseRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  async get(id: string): Promise<CourseRecord> {
    const curso = await this.repo.findById(id)
    if (curso === null) throw new NotFoundError('The course does not exist.', 'COURSE_NOT_FOUND')
    return curso
  }

  /** Escribe con un slug libre, reintentando si otra peticion se lo lleva antes. */
  private conSlugLibre<T>(
    base: string,
    exceptId: string | undefined,
    escribir: (slug: string) => Promise<T>,
  ): Promise<T> {
    return escribirConSlugLibre({
      base,
      exceptId,
      existe: (slug, except) => this.repo.slugExists(slug, except),
      escribir,
      agotado: () => escribir(`${base.slice(0, 190)}-${Date.now().toString(36)}`),
    })
  }

  async create(input: CourseWriteInput, actor: TeachingActor): Promise<CourseRecord> {
    const creado = await this.conSlugLibre(
      generateSlug(input.slug === '' ? input.title : input.slug),
      undefined,
      (slug) => this.repo.create({ ...input, slug }),
    )

    await this.audit.record({
      userId: actor.userId,
      action: 'create',
      entityType: 'courses',
      entityId: creado.id,
      newData: { title: creado.title, slug: creado.slug },
      ipAddress: actor.ipAddress,
    })

    return creado
  }

  async update(
    id: string,
    input: Partial<CourseWriteInput>,
    actor: TeachingActor,
  ): Promise<CourseRecord> {
    const actual = await this.get(id)

    // RN-010 tambien aplica a cursos: un slug publicado no cambia.
    const slugDeseado = resolveSlugOnUpdate({
      slugActual: actual.slug,
      slugSolicitado: input.slug,
      tituloNuevo: input.title,
      yaPublicado: actual.editorialStatus === 'published',
    })
    const actualizado =
      slugDeseado === actual.slug
        ? await this.repo.update(id, { ...input, slug: actual.slug })
        : await this.conSlugLibre(slugDeseado, id, (slug) =>
            this.repo.update(id, { ...input, slug }),
          )

    await this.audit.record({
      userId: actor.userId,
      action: 'update',
      entityType: 'courses',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return actualizado
  }

  async publish(id: string, actor: TeachingActor): Promise<CourseRecord> {
    await this.get(id)
    const publicado = await this.repo.setEditorialStatus(id, 'published', {
      publishedAt: this.now(),
    })

    await this.audit.record({
      userId: actor.userId,
      action: 'publish',
      entityType: 'courses',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return publicado
  }

  async archive(id: string, actor: TeachingActor): Promise<CourseRecord> {
    await this.get(id)
    const archivado = await this.repo.setEditorialStatus(id, 'archived', courseStateAfterArchive())

    await this.audit.record({
      userId: actor.userId,
      action: 'archive',
      entityType: 'courses',
      entityId: id,
      ipAddress: actor.ipAddress,
    })

    return archivado
  }

  /** RN-004. */
  async setFeatured(
    id: string,
    isFeatured: boolean,
    featuredOrder: number | null,
  ): Promise<CourseRecord> {
    const actual = await this.get(id)
    if (isFeatured) assertCourseCanBeFeatured({ editorialStatus: actual.editorialStatus })
    return this.repo.setFeatured(id, isFeatured, isFeatured ? featuredOrder : null)
  }

  async delete(id: string, actor: TeachingActor): Promise<void> {
    await this.get(id)
    await this.repo.delete(id)
    await this.audit.record({
      userId: actor.userId,
      action: 'delete',
      entityType: 'courses',
      entityId: id,
      ipAddress: actor.ipAddress,
    })
  }

  // --- Ediciones ---

  /** RN-006, compartida con las afiliaciones: el departamento es de la institucion. */
  private async assertCoherencia(
    institutionId: string,
    // Ausente y vacio significan lo mismo aqui: la edicion no cuelga de un departamento.
    departmentIdEntrante: string | null | undefined,
  ): Promise<void> {
    const departmentId = departmentIdEntrante ?? null

    const institucion = await this.institutions.findInstitution(institutionId)
    if (institucion === null) {
      throw new NotFoundError('The institution does not exist.', 'INSTITUTION_NOT_FOUND')
    }

    const departamento =
      departmentId === null ? null : await this.institutions.findDepartment(departmentId)

    assertDepartmentBelongsToInstitution({
      departmentId,
      departmentInstitutionId: departamento?.institutionId ?? null,
      institutionId,
    })
  }

  async getOffering(id: string): Promise<CourseOfferingRecord> {
    const edicion = await this.repo.findOffering(id)
    if (edicion === null) {
      throw new NotFoundError('The course offering does not exist.', 'OFFERING_NOT_FOUND')
    }
    return edicion
  }

  async createOffering(input: CourseOfferingWriteInput): Promise<CourseOfferingRecord> {
    await this.get(input.courseId)
    await this.assertCoherencia(input.institutionId, input.departmentId ?? null)
    return this.repo.createOffering(input)
  }

  /**
   * Cambiar de institucion es una edicion normal: NO duplica el curso. Es la prueba
   * practica de que la jerarquia del ERS §2.4 esta bien modelada.
   */
  async updateOffering(
    id: string,
    input: Partial<CourseOfferingWriteInput>,
  ): Promise<CourseOfferingRecord> {
    const actual = await this.getOffering(id)

    const institutionId = input.institutionId ?? actual.institutionId
    const departmentId = input.departmentId === undefined ? actual.departmentId : input.departmentId

    await this.assertCoherencia(institutionId, departmentId)
    return this.repo.updateOffering(id, input)
  }

  /** RN-005. */
  async publishOffering(id: string): Promise<CourseOfferingRecord> {
    const edicion = await this.getOffering(id)
    const curso = await this.get(edicion.courseId)

    assertOfferingCanBePublished({ courseEditorialStatus: curso.editorialStatus })

    return this.repo.setOfferingEditorialStatus(id, 'published', this.now())
  }

  async archiveOffering(id: string): Promise<CourseOfferingRecord> {
    await this.getOffering(id)
    return this.repo.setOfferingEditorialStatus(id, 'archived', null)
  }

  async deleteOffering(id: string): Promise<void> {
    await this.getOffering(id)
    await this.repo.deleteOffering(id)
  }

  // --- Materiales ---

  async createMaterial(input: CourseMaterialInput): Promise<CourseMaterialRecord> {
    await this.getOffering(input.courseOfferingId)
    assertMaterialSourceIsExclusive(input)
    return this.repo.createMaterial(input)
  }

  async updateMaterial(
    id: string,
    input: Partial<CourseMaterialInput>,
  ): Promise<CourseMaterialRecord> {
    const actual = await this.repo.findMaterial(id)
    if (actual === null) {
      throw new NotFoundError('The material does not exist.', 'MATERIAL_NOT_FOUND')
    }

    // Se valida el resultado del PATCH, no lo enviado: cambiar solo uno de los dos
    // campos podria dejar el material con archivo y enlace a la vez.
    assertMaterialSourceIsExclusive({
      mediaId: input.mediaId === undefined ? actual.mediaId : input.mediaId,
      externalUrl: input.externalUrl === undefined ? actual.externalUrl : input.externalUrl,
    })

    return this.repo.updateMaterial(id, input)
  }

  async deleteMaterial(id: string): Promise<void> {
    const actual = await this.repo.findMaterial(id)
    if (actual === null) {
      throw new NotFoundError('The material does not exist.', 'MATERIAL_NOT_FOUND')
    }
    await this.repo.deleteMaterial(id)
  }
}
