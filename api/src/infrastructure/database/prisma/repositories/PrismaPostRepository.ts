import type {
  PostFileRecord,
  PostFileWithType,
  PostListFilters,
  PostRecord,
  PostRepository,
  PostWriteInput,
} from '../../../../application/ports/repositories/PostRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { matchIdOrSlug } from '../../../../shared/uuid.js'
import { prisma } from '../client.js'
import type { EditorialStatus, Prisma } from '../generated/client.js'

const INCLUDE = {
  files: {
    orderBy: { sortOrder: 'asc' },
    select: {
      mediaId: true,
      label: true,
      sortOrder: true,
      isPublic: true,
      // El tipo real del archivo, para que la ficha sepa si ofrecer un reproductor en
      // lugar de un enlace de descarga.
      media: { select: { mimeType: true } },
    },
  },
} as const

/** Solo lo publicado sale a la web (RN-001). */
const SOLO_PUBLICADOS = { editorialStatus: 'published' } as const

/**
 * El orden del listado: primero lo que el titular haya colocado a mano, y despues por
 * fecha de publicacion descendente. Es el mismo criterio de RF-012 para los trabajos.
 */
const ORDEN = [
  { displayOrder: { sort: 'asc', nulls: 'last' } },
  { publishedAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[]

type FilaDeArchivo = Omit<PostFileWithType, 'mimeType'> & { media: { mimeType: string } }
type Fila = Omit<PostRecord, 'editorialStatus' | 'files'> & {
  editorialStatus: string
  files: FilaDeArchivo[]
}

const aRegistro = (fila: Fila): PostRecord => ({
  ...fila,
  files: fila.files.map(({ media, ...archivo }) => ({ ...archivo, mimeType: media.mimeType })),
})

/** Los adjuntos se reemplazan enteros: mas simple que calcular el diferencial. */
async function escribirAdjuntos(
  tx: Prisma.TransactionClient,
  postId: string,
  files: PostFileRecord[] | undefined,
): Promise<void> {
  if (files === undefined) return
  await tx.postFile.deleteMany({ where: { postId } })
  if (files.length > 0) {
    await tx.postFile.createMany({ data: files.map((file) => ({ ...file, postId })) })
  }
}

/** Lo que va a la fila, sin los adjuntos, conservando que es obligatorio y que no. */
function escalares<T extends Partial<PostWriteInput>>(input: T): Omit<T, 'files'> {
  const { files: _f, ...resto } = input
  return resto
}

export class PrismaPostRepository implements PostRepository {
  async list(
    query: PaginationQuery,
    filters: PostListFilters,
  ): Promise<{ items: PostRecord[]; totalItems: number }> {
    const where: Prisma.PostWhereInput = {
      ...(filters.editorialStatus === null
        ? {}
        : { editorialStatus: filters.editorialStatus as EditorialStatus }),
      ...(filters.kind === null ? {} : { kind: filters.kind }),
      ...(filters.search === null || filters.search.trim() === ''
        ? {}
        : {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { summary: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.post.findMany({ where, skip, take, orderBy: ORDEN, include: INCLUDE }),
      prisma.post.count({ where }),
    ])

    return { items: filas.map(aRegistro), totalItems }
  }

  async findById(id: string): Promise<PostRecord | null> {
    const fila = await prisma.post.findUnique({ where: { id }, include: INCLUDE })
    return fila === null ? null : aRegistro(fila)
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const fila = await prisma.post.findFirst({
      where: { slug, ...(exceptId === undefined ? {} : { NOT: { id: exceptId } }) },
      select: { id: true },
    })
    return fila !== null
  }

  async create(input: PostWriteInput, actorId: string | null): Promise<PostRecord> {
    const creado = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: { ...escalares(input), createdBy: actorId, updatedBy: actorId },
      })
      await escribirAdjuntos(tx, post.id, input.files)
      return post.id
    })

    const fila = await prisma.post.findUniqueOrThrow({ where: { id: creado }, include: INCLUDE })
    return aRegistro(fila)
  }

  async update(
    id: string,
    input: Partial<PostWriteInput>,
    actorId: string | null,
  ): Promise<PostRecord> {
    await prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id }, data: { ...escalares(input), updatedBy: actorId } })
      await escribirAdjuntos(tx, id, input.files)
    })

    const fila = await prisma.post.findUniqueOrThrow({ where: { id }, include: INCLUDE })
    return aRegistro(fila)
  }

  async delete(id: string): Promise<void> {
    await prisma.post.delete({ where: { id } })
  }

  async setEditorialStatus(
    id: string,
    status: string,
    publishedAt: Date | null,
  ): Promise<PostRecord> {
    const fila = await prisma.post.update({
      where: { id },
      data: { editorialStatus: status as EditorialStatus, publishedAt },
      include: INCLUDE,
    })
    return aRegistro(fila)
  }

  async listPublished(
    query: PaginationQuery,
    filters: { kind: string | null },
  ): Promise<{ items: PostRecord[]; totalItems: number }> {
    const where: Prisma.PostWhereInput = {
      ...SOLO_PUBLICADOS,
      ...(filters.kind === null ? {} : { kind: filters.kind }),
    }

    const { skip, take } = toSkipTake(query)
    const [filas, totalItems] = await Promise.all([
      prisma.post.findMany({ where, skip, take, orderBy: ORDEN, include: INCLUDE }),
      prisma.post.count({ where }),
    ])

    return { items: filas.map(aRegistro), totalItems }
  }

  async findPublished(idOrSlug: string): Promise<PostRecord | null> {
    const fila = await prisma.post.findFirst({
      where: { ...SOLO_PUBLICADOS, OR: matchIdOrSlug(idOrSlug) },
      include: INCLUDE,
    })
    return fila === null ? null : aRegistro(fila)
  }

  listPublishedSlugs(): Promise<Array<{ kind: string; slug: string; publishedAt: Date | null }>> {
    return prisma.post.findMany({
      where: SOLO_PUBLICADOS,
      select: { kind: true, slug: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    })
  }
}
