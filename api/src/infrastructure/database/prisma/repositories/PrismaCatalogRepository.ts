import type {
  CatalogRepository,
  CatalogTermInput,
  CatalogTermRecord,
  CatalogTermUsage,
} from '../../../../application/ports/repositories/CatalogRepository.js'
import { prisma } from '../client.js'

const CAMPOS = {
  id: true,
  catalog: true,
  code: true,
  label: true,
  description: true,
  sortOrder: true,
  isActive: true,
} as const

/**
 * Donde se usa cada vocabulario.
 *
 * Se declara aqui, junto a la consulta, porque es conocimiento de la base de datos: que
 * columna guarda los codigos de cada catalogo. Si manana un catalogo se usa en dos
 * sitios, se suman.
 */
const USOS: Record<string, (code: string) => Promise<number>> = {
  work_link: (code) => prisma.workLink.count({ where: { linkType: code } }),
  person_link: (code) => prisma.personLink.count({ where: { linkType: code } }),
  work_file: (code) => prisma.workFile.count({ where: { fileType: code } }),
  course_material: (code) => prisma.courseMaterial.count({ where: { materialType: code } }),
  affiliation: (code) => prisma.affiliation.count({ where: { affiliationType: code } }),
  venue: (code) => prisma.venue.count({ where: { venueType: code } }),
  event: (code) => prisma.event.count({ where: { eventType: code } }),
  course_level: (code) => prisma.course.count({ where: { level: code } }),
}

export class PrismaCatalogRepository implements CatalogRepository {
  list(catalog: string | null, activeOnly: boolean): Promise<CatalogTermRecord[]> {
    return prisma.catalogTerm.findMany({
      where: {
        ...(catalog === null ? {} : { catalog }),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: [{ catalog: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: CAMPOS,
    })
  }

  findById(id: string): Promise<CatalogTermRecord | null> {
    return prisma.catalogTerm.findUnique({ where: { id }, select: CAMPOS })
  }

  findByCode(catalog: string, code: string): Promise<CatalogTermRecord | null> {
    return prisma.catalogTerm.findUnique({
      where: { catalog_code: { catalog, code } },
      select: CAMPOS,
    })
  }

  create(input: CatalogTermInput): Promise<CatalogTermRecord> {
    return prisma.catalogTerm.create({ data: input, select: CAMPOS })
  }

  update(
    id: string,
    input: Partial<Omit<CatalogTermInput, 'catalog' | 'code'>>,
  ): Promise<CatalogTermRecord> {
    return prisma.catalogTerm.update({ where: { id }, data: input, select: CAMPOS })
  }

  async delete(id: string): Promise<void> {
    await prisma.catalogTerm.delete({ where: { id } })
  }

  async countUsage(catalog: string, code: string): Promise<CatalogTermUsage> {
    const contar = USOS[catalog]
    // Un catalogo sin uso declarado todavia no lo referencia nadie: cero, no error.
    return { total: contar === undefined ? 0 : await contar(code) }
  }
}
