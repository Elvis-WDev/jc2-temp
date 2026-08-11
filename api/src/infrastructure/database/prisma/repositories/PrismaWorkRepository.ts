import type {
  WorkRecord,
  WorkRepository,
  WorkWriteInput,
} from '../../../../application/ports/repositories/WorkRepository.js'
import { NotFoundError } from '../../../../shared/errors/AppError.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { EditorialStatus, Prisma } from '../generated/client.js'
import { INCLUDE_WORK, mapWork } from './workMapper.js'

/**
 * Campos escalares de `works`, sin las relaciones que se escriben aparte.
 *
 * Sin anotar el tipo de retorno a proposito: los tipos de `create` y `update` de
 * Prisma no son intercambiables, y dejar que infiera en cada punto de uso evita
 * tener que forzar una conversion que ocultaria errores reales.
 */
function escalares(input: Partial<WorkWriteInput>) {
  // `academicStatus` sale aparte: por la API viaja el codigo y en la base de datos es
  // una relacion, asi que lo resuelve `conectarEstado`.
  const { authors: _a, tagIds: _t, links: _l, files: _f, academicStatus: _s, ...resto } = input
  return resto
}

/**
 * Traduce el codigo del estado academico a la relacion.
 *
 * El codigo es lo que viaja por la API y por la URL publica `?status=`, asi que no
 * cambia aunque por dentro sea una tabla. Si no existe, el error dice cual se pidio en
 * vez de dejar que la clave foranea suelte un mensaje ilegible.
 */
async function conectarEstado(cliente: Prisma.TransactionClient, code: string): Promise<string> {
  const estado = await cliente.academicStatus.findUnique({ where: { code }, select: { id: true } })
  if (estado === null) {
    throw new NotFoundError(
      `The academic status "${code}" does not exist.`,
      'ACADEMIC_STATUS_NOT_FOUND',
    )
  }
  return estado.id
}

/**
 * Repositorio administrativo de Research. Ve borradores y archivados.
 *
 * Las escrituras compuestas van en una transaccion (ERS §49): crear un trabajo toca
 * cinco tablas, y si falla la tercera no puede quedar a medias.
 */
export class PrismaWorkRepository implements WorkRepository {
  async list(
    query: PaginationQuery,
    filters: { search: string | null; editorialStatus: string | null },
  ): Promise<{ items: WorkRecord[]; totalItems: number }> {
    const where: Prisma.WorkWhereInput = {
      ...(filters.editorialStatus === null
        ? {}
        : { editorialStatus: filters.editorialStatus as EditorialStatus }),
      ...(filters.search === null || filters.search.trim() === ''
        ? {}
        : {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { venueName: { contains: filters.search, mode: 'insensitive' } },
              { doi: { contains: filters.search.toLowerCase() } },
            ],
          }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.work.findMany({
        where,
        skip,
        take,
        orderBy: [{ updatedAt: 'desc' }],
        include: INCLUDE_WORK,
      }),
      prisma.work.count({ where }),
    ])

    return { items: filas.map(mapWork), totalItems }
  }

  async findById(id: string): Promise<WorkRecord | null> {
    const fila = await prisma.work.findUnique({ where: { id }, include: INCLUDE_WORK })
    return fila === null ? null : mapWork(fila)
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const encontrado = await prisma.work.findFirst({
      where: { slug, ...(exceptId === undefined ? {} : { NOT: { id: exceptId } }) },
      select: { id: true },
    })
    return encontrado !== null
  }

  async create(input: WorkWriteInput): Promise<WorkRecord> {
    const creado = await prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: {
          ...escalares(input),
          workTypeId: input.workTypeId,
          title: input.title,
          slug: input.slug,
          academicStatusId: await conectarEstado(tx, input.academicStatus),
          editorialStatus: 'draft',
        },
        select: { id: true },
      })

      await this.escribirRelaciones(tx, work.id, input)
      return work.id
    })

    return (await this.findById(creado)) as WorkRecord
  }

  async update(id: string, input: Partial<WorkWriteInput>): Promise<WorkRecord> {
    await prisma.$transaction(async (tx) => {
      await tx.work.update({
        where: { id },
        data: {
          ...escalares(input),
          ...(input.academicStatus === undefined
            ? {}
            : { academicStatusId: await conectarEstado(tx, input.academicStatus) }),
        },
      })
      await this.escribirRelaciones(tx, id, input)
    })

    return (await this.findById(id)) as WorkRecord
  }

  /**
   * Reemplaza las colecciones enviadas. Una coleccion ausente no se toca; una
   * presente se sustituye entera, que es lo que espera un formulario que envia la
   * lista completa de autores o tags.
   */
  private async escribirRelaciones(
    tx: Prisma.TransactionClient,
    workId: string,
    input: Partial<WorkWriteInput>,
  ): Promise<void> {
    if (input.authors !== undefined) {
      await tx.workAuthor.deleteMany({ where: { workId } })
      if (input.authors.length > 0) {
        await tx.workAuthor.createMany({
          data: input.authors.map((autor) => ({
            workId,
            personId: autor.personId,
            authorOrder: autor.authorOrder,
            contributionRole: autor.contributionRole ?? null,
            isCorresponding: autor.isCorresponding ?? false,
          })),
        })
      }
    }

    if (input.tagIds !== undefined) {
      await tx.workTag.deleteMany({ where: { workId } })
      if (input.tagIds.length > 0) {
        await tx.workTag.createMany({
          data: input.tagIds.map((tagId) => ({ workId, tagId })),
        })
      }
    }

    if (input.links !== undefined) {
      await tx.workLink.deleteMany({ where: { workId } })
      if (input.links.length > 0) {
        await tx.workLink.createMany({
          data: input.links.map((link, indice) => ({
            workId,
            linkType: link.linkType,
            label: link.label ?? null,
            url: link.url,
            sortOrder: link.sortOrder ?? indice,
            isPublic: link.isPublic ?? true,
          })),
        })
      }
    }

    if (input.files !== undefined) {
      await tx.workFile.deleteMany({ where: { workId } })
      if (input.files.length > 0) {
        await tx.workFile.createMany({
          data: input.files.map((archivo, indice) => ({
            workId,
            mediaId: archivo.mediaId,
            fileType: archivo.fileType,
            label: archivo.label ?? null,
            versionLabel: archivo.versionLabel ?? null,
            sortOrder: archivo.sortOrder ?? indice,
            isPublic: archivo.isPublic ?? false,
          })),
        })
      }
    }
  }

  async setEditorialStatus(
    id: string,
    status: 'draft' | 'published' | 'archived',
    extra: {
      publishedAt?: Date | null
      archivedAt?: Date | null
      isFeatured?: boolean
      featuredOrder?: number | null
    },
  ): Promise<WorkRecord> {
    await prisma.work.update({
      where: { id },
      data: { editorialStatus: status, ...extra },
    })
    return (await this.findById(id)) as WorkRecord
  }

  async setFeatured(
    id: string,
    isFeatured: boolean,
    featuredOrder: number | null,
  ): Promise<WorkRecord> {
    await prisma.work.update({ where: { id }, data: { isFeatured, featuredOrder } })
    return (await this.findById(id)) as WorkRecord
  }

  async setCarousel(
    id: string,
    isCarousel: boolean,
    carouselOrder: number | null,
  ): Promise<WorkRecord> {
    await prisma.work.update({ where: { id }, data: { isCarousel, carouselOrder } })
    return (await this.findById(id)) as WorkRecord
  }

  async delete(id: string): Promise<void> {
    await prisma.work.delete({ where: { id } })
  }

  countAuthors(id: string): Promise<number> {
    return prisma.workAuthor.count({ where: { workId: id } })
  }
}
