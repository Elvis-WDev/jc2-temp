import { generateSlug } from '../../../domain/research/Slug.js'
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js'
import { paginate, type Paginated, type PaginationQuery } from '../../../shared/http/pagination.js'
import type { TagInput, TagRecord, TagRepository } from '../../ports/repositories/TagRepository.js'

export interface TagListFilters {
  search: string | null
  category: string | null
  /** `true` solo las visibles, `false` solo las ocultas, `null` todas. */
  active: boolean | null
}

/**
 * Gestion centralizada de tags (ERS §17, RF-007).
 *
 * El proposito de RF-007 es impedir que "Behavioral Economics", "behavioral economics"
 * y "Behavioral economics" acaben siendo tres valores distintos. Aqui eso se consigue
 * con una sola idea: el slug se deriva del nombre y es la identidad real del tag. Dos
 * nombres que colapsan al mismo slug son el mismo tag.
 */
export class TagUseCases {
  constructor(private readonly repo: TagRepository) {}

  async list(query: PaginationQuery, filters: TagListFilters): Promise<Paginated<TagRecord>> {
    const { items, totalItems } = await this.repo.list(query, filters)
    return paginate(items, query, totalItems)
  }

  /** Para poder filtrar por categoria hay que saber cuales existen: son texto libre. */
  listCategories(): Promise<string[]> {
    return this.repo.listCategories()
  }

  async get(id: string): Promise<TagRecord> {
    const tag = await this.repo.findById(id)
    if (tag === null) throw new NotFoundError('The tag does not exist.', 'TAG_NOT_FOUND')
    return tag
  }

  /**
   * Crea el tag, o rechaza indicando cual ya existe.
   *
   * Se devuelve el id del existente en `fields` para que la interfaz pueda ofrecer
   * "usar el que ya hay" en lugar de dejar al administrador adivinando por que no le
   * deja crearlo.
   */
  async create(input: {
    name: string
    category?: string | null
    sortOrder?: number
  }): Promise<TagRecord> {
    const slug = generateSlug(input.name)

    const existente = await this.repo.findBySlug(slug)
    if (existente !== null) {
      throw new ConflictError(
        `A tag with this name already exists: "${existente.name}".`,
        'TAG_ALREADY_EXISTS',
        { name: 'This tag already exists.', existingTagId: existente.id },
      )
    }

    return this.repo.create({
      name: input.name.trim(),
      slug,
      category: input.category ?? null,
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    })
  }

  /**
   * Renombrar NO regenera el slug.
   *
   * Un slug de tag viaja en los filtros publicos (`?tag=behavioral-economics`) y en
   * las facets, asi que puede estar en un enlace compartido. Corregir la
   * capitalizacion del nombre no debe romperlo. Es la misma razon que RN-010 para los
   * trabajos.
   */
  async update(
    id: string,
    input: { name?: string; category?: string | null; sortOrder?: number; isActive?: boolean },
  ): Promise<TagRecord> {
    await this.get(id)

    const cambios: Partial<TagInput> = {
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.category === undefined ? {} : { category: input.category }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    }

    return this.repo.update(id, cambios)
  }

  /**
   * Borrar un tag en uso exige confirmacion explicita.
   *
   * El esquema tiene `onDelete: Cascade` sobre work_tags y course_tags, asi que sin
   * esta comprobacion el borrado desharia asociaciones en silencio y el administrador
   * no se enteraria hasta ver un trabajo sin sus keywords.
   */
  async delete(id: string, force: boolean): Promise<void> {
    await this.get(id)

    if (!force) {
      const usos = await this.repo.countUsage(id)
      if (usos.total > 0) {
        const detalle = [
          usos.works > 0 ? `${usos.works} trabajos` : null,
          usos.courses > 0 ? `${usos.courses} cursos` : null,
        ]
          .filter((parte): parte is string => parte !== null)
          .join(' y ')

        throw new ConflictError(
          `The tag is used by ${detalle}. Deactivate it, or delete it explicitly with force.`,
          'TAG_IN_USE',
        )
      }
    }

    await this.repo.delete(id)
  }
}
