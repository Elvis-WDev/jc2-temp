import type {
  CreateMediaAssetInput,
  MediaAssetRecord,
  MediaListFilters,
  MediaReferences,
  MediaRepository,
  UpdateMediaMetadataInput,
} from '../../../../application/ports/repositories/MediaRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { MediaAsset } from '../generated/client.js'
import type { Prisma } from '../generated/client.js'

/** `size_bytes` es BIGINT en PostgreSQL; la aplicacion lo maneja como number. */
function toRecord(row: MediaAsset): MediaAssetRecord {
  return {
    id: row.id,
    storageKey: row.storageKey,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    checksumSha256: row.checksumSha256,
    altText: row.altText,
    caption: row.caption,
    credit: row.credit,
    isPublic: row.isPublic,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
  }
}

export class PrismaMediaRepository implements MediaRepository {
  async create(input: CreateMediaAssetInput): Promise<MediaAssetRecord> {
    const row = await prisma.mediaAsset.create({
      data: {
        id: input.id,
        storageKey: input.storageKey,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256: input.checksumSha256,
        isPublic: input.isPublic,
        uploadedBy: input.uploadedBy,
        altText: input.altText ?? null,
        caption: input.caption ?? null,
        credit: input.credit ?? null,
      },
    })
    return toRecord(row)
  }

  async findById(id: string): Promise<MediaAssetRecord | null> {
    const row = await prisma.mediaAsset.findUnique({ where: { id } })
    return row === null ? null : toRecord(row)
  }

  async findByChecksum(checksum: string): Promise<MediaAssetRecord | null> {
    const row = await prisma.mediaAsset.findFirst({ where: { checksumSha256: checksum } })
    return row === null ? null : toRecord(row)
  }

  async list(
    query: PaginationQuery,
    filters: MediaListFilters,
  ): Promise<{ items: MediaAssetRecord[]; totalItems: number }> {
    const where: Prisma.MediaAssetWhereInput = {
      ...(filters.mimeTypes === null ? {} : { mimeType: { in: [...filters.mimeTypes] } }),
      ...(filters.isPublic === null ? {} : { isPublic: filters.isPublic }),
      ...(filters.search === null
        ? {}
        : { originalFilename: { contains: filters.search, mode: 'insensitive' } }),
    }

    const { skip, take } = toSkipTake(query)
    const [rows, totalItems] = await Promise.all([
      // El total cuenta con el MISMO `where`: si contara todo, la paginacion
      // prometeria paginas que no existen en cuanto se filtra.
      prisma.mediaAsset.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.mediaAsset.count({ where }),
    ])
    return { items: rows.map(toRecord), totalItems }
  }

  async updateMetadata(id: string, input: UpdateMediaMetadataInput): Promise<MediaAssetRecord> {
    const row = await prisma.mediaAsset.update({
      where: { id },
      // Solo se tocan las claves presentes: un PATCH sin `caption` no lo borra.
      data: {
        ...(input.altText === undefined ? {} : { altText: input.altText }),
        ...(input.caption === undefined ? {} : { caption: input.caption }),
        ...(input.credit === undefined ? {} : { credit: input.credit }),
        ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
      },
    })
    return toRecord(row)
  }

  async delete(id: string): Promise<void> {
    await prisma.mediaAsset.delete({ where: { id } })
  }

  async countReferences(id: string): Promise<MediaReferences> {
    const [
      workFiles,
      courseMaterials,
      personPhotos,
      personCvs,
      institutionLogos,
      workCovers,
      courseCovers,
      pageHeroes,
      siteOgImages,
      siteLogos,
      sectionBackgrounds,
      eventImages,
      linkIcons,
    ] = await Promise.all([
      prisma.workFile.count({ where: { mediaId: id } }),
      prisma.courseMaterial.count({ where: { mediaId: id } }),
      prisma.person.count({ where: { photoMediaId: id } }),
      prisma.person.count({ where: { cvMediaId: id } }),
      prisma.institution.count({ where: { logoMediaId: id } }),
      prisma.work.count({ where: { coverMediaId: id } }),
      prisma.course.count({ where: { coverMediaId: id } }),
      prisma.pageContent.count({ where: { heroMediaId: id } }),
      prisma.siteSettings.count({ where: { ogImageMediaId: id } }),
      prisma.siteSettings.count({ where: { logoMediaId: id } }),
      prisma.pageSection.count({ where: { backgroundMediaId: id } }),
      prisma.event.count({ where: { imageMediaId: id } }),
      prisma.personLink.count({ where: { iconMediaId: id } }),
    ])

    const referencias = {
      workFiles,
      courseMaterials,
      personPhotos,
      personCvs,
      institutionLogos,
      workCovers,
      courseCovers,
      pageHeroes,
      siteOgImages,
      siteLogos,
      sectionBackgrounds,
      eventImages,
      linkIcons,
    }

    return {
      ...referencias,
      total: Object.values(referencias).reduce((suma, valor) => suma + valor, 0),
    }
  }

  async isPubliclyReachable(id: string): Promise<boolean> {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { isPublic: true } })

    // Primer filtro: el archivo debe estar marcado publico.
    if (asset === null || !asset.isPublic) return false

    // Segundo filtro: ademas debe colgar de algo publicado y publico. Un archivo
    // publico dentro de un work en borrador no es alcanzable (RN-001).
    const [
      archivoDeWork,
      materialDeCurso,
      portadaDeWork,
      portadaDeCurso,
      fotoOCv,
      logo,
      heroDePagina,
      ogDelSitio,
      emblemaDelSitio,
      fondoDeSeccion,
      imagenDeEvento,
    ] = await Promise.all([
      prisma.workFile.count({
        where: { mediaId: id, isPublic: true, work: { editorialStatus: 'published' } },
      }),
      prisma.courseMaterial.count({
        where: {
          mediaId: id,
          isPublic: true,
          offering: {
            editorialStatus: 'published',
            course: { editorialStatus: 'published' },
          },
        },
      }),
      prisma.work.count({ where: { coverMediaId: id, editorialStatus: 'published' } }),
      prisma.course.count({ where: { coverMediaId: id, editorialStatus: 'published' } }),
      // Foto y CV del propietario del sitio: los muestra Home, asi que su
      // alcanzabilidad depende solo de is_public.
      prisma.person.count({
        where: { OR: [{ photoMediaId: id }, { cvMediaId: id }], isSiteOwner: true },
      }),
      prisma.institution.count({ where: { logoMediaId: id, isActive: true } }),
      prisma.pageContent.count({ where: { heroMediaId: id, isPublished: true } }),
      prisma.siteSettings.count({ where: { ogImageMediaId: id } }),
      // El emblema esta en la cabecera de todas las paginas: no cuelga de nada que
      // pueda estar en borrador.
      prisma.siteSettings.count({ where: { logoMediaId: id } }),
      // El fondo de una seccion no se condiciona a que su pagina este publicada: las
      // fichas de detalle heredan el fondo de la cabecera de su listado y se siguen
      // abriendo aunque el listado este oculto.
      prisma.pageSection.count({ where: { backgroundMediaId: id } }),
      // La imagen de un evento publicado. Faltaba: la agenda entregaba su direccion y
      // la descarga respondia 404, asi que el hueco se pintaba vacio.
      prisma.event.count({ where: { imageMediaId: id, editorialStatus: 'published' } }),
    ])

    return (
      archivoDeWork +
        materialDeCurso +
        portadaDeWork +
        portadaDeCurso +
        fotoOCv +
        logo +
        heroDePagina +
        ogDelSitio +
        emblemaDelSitio +
        fondoDeSeccion +
        imagenDeEvento >
      0
    )
  }
}
