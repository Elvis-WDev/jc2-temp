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

  /**
   * Los textos largos que citan el archivo dentro de su Markdown.
   *
   * Una imagen intercalada en un cuerpo no tiene columna propia: su unica huella es la
   * direccion escrita en el texto. Buscar el identificador basta —es un UUID, no
   * aparece por casualidad— y es lo que evita que borrar el archivo deje un hueco sin
   * que nadie avise, y que una imagen recien pegada no llegue a servirse.
   *
   * `soloPublicado` distingue los dos usos: contar referencias mira todo, y decidir si
   * se sirve mira solo lo que el publico puede ver (RN-001).
   */
  private citasEnTextoLargo(id: string, soloPublicado: boolean) {
    const cita = { contains: id }
    const publicado = soloPublicado ? { editorialStatus: 'published' as const } : {}

    return Promise.all([
      prisma.work.count({
        where: {
          ...publicado,
          OR: [{ abstractMarkdown: cita }, { descriptionMarkdown: cita }],
        },
      }),
      prisma.course.count({ where: { ...publicado, descriptionMarkdown: cita } }),
      prisma.courseOffering.count({
        where: soloPublicado
          ? {
              contentMarkdown: cita,
              editorialStatus: 'published',
              course: { editorialStatus: 'published' },
            }
          : { contentMarkdown: cita },
      }),
      prisma.event.count({ where: { ...publicado, contentMarkdown: cita } }),
      prisma.post.count({ where: { ...publicado, contentMarkdown: cita } }),
      prisma.person.count({
        where: {
          // Igual que su foto y su CV: lo que el titular escribe de si mismo lo ensena
          // la portada, asi que no cuelga de nada que pueda estar en borrador.
          ...(soloPublicado ? { isSiteOwner: true } : {}),
          OR: [{ fullBioMarkdown: cita }, { researchStatementMarkdown: cita }],
        },
      }),
      prisma.pageContent.count({
        where: {
          ...(soloPublicado ? { isPublished: true } : {}),
          OR: [{ introMarkdown: cita }, { secondaryMarkdown: cita }],
        },
      }),
    ]).then((recuentos) => recuentos.reduce((suma, valor) => suma + valor, 0))
  }

  async countReferences(id: string): Promise<MediaReferences> {
    // Por nombre y no por posicion, igual que en `isPubliclyReachable`: aqui ya paso una
    // vez que anadir una consulta en medio corriera todos los nombres siguientes.
    const consultas = {
      workFiles: prisma.workFile.count({ where: { mediaId: id } }),
      courseMaterials: prisma.courseMaterial.count({ where: { mediaId: id } }),
      personPhotos: prisma.person.count({ where: { photoMediaId: id } }),
      personCvs: prisma.person.count({ where: { cvMediaId: id } }),
      institutionLogos: prisma.institution.count({ where: { logoMediaId: id } }),
      workCovers: prisma.work.count({ where: { coverMediaId: id } }),
      courseCovers: prisma.course.count({ where: { coverMediaId: id } }),
      pageHeroes: prisma.pageContent.count({ where: { heroMediaId: id } }),
      siteOgImages: prisma.siteSettings.count({ where: { ogImageMediaId: id } }),
      siteLogos: prisma.siteSettings.count({ where: { logoMediaId: id } }),
      siteFooters: prisma.siteSettings.count({ where: { footerMediaId: id } }),
      sectionBackgrounds: prisma.pageSection.count({ where: { backgroundMediaId: id } }),
      eventImages: prisma.event.count({ where: { imageMediaId: id } }),
      linkIcons: prisma.personLink.count({ where: { iconMediaId: id } }),
      postImages: prisma.post.count({ where: { imageMediaId: id } }),
      postFiles: prisma.postFile.count({ where: { mediaId: id } }),
      richTextMentions: this.citasEnTextoLargo(id, false),
    }

    const nombres = Object.keys(consultas) as Array<keyof typeof consultas>
    const recuentos = await Promise.all(Object.values(consultas))
    const referencias = Object.fromEntries(
      nombres.map((nombre, indice) => [nombre, recuentos[indice] as number]),
    ) as Omit<MediaReferences, 'total'>

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
    //
    // Por nombre y no por posicion: cuando esto era un array destructurado, anadir una
    // consulta en medio corria todos los nombres siguientes un puesto y la ultima se
    // quedaba sin nombre, de modo que su condicion dejaba de contar en silencio. Con un
    // objeto, anadir una entrada no puede desplazar a ninguna otra.
    const alcances = {
      archivoDeWork: prisma.workFile.count({
        where: { mediaId: id, isPublic: true, work: { editorialStatus: 'published' } },
      }),
      materialDeCurso: prisma.courseMaterial.count({
        where: {
          mediaId: id,
          isPublic: true,
          offering: {
            editorialStatus: 'published',
            course: { editorialStatus: 'published' },
          },
        },
      }),
      portadaDeWork: prisma.work.count({
        where: { coverMediaId: id, editorialStatus: 'published' },
      }),
      portadaDeCurso: prisma.course.count({
        where: { coverMediaId: id, editorialStatus: 'published' },
      }),
      // Foto y CV del propietario del sitio: los muestra Home, asi que su
      // alcanzabilidad depende solo de is_public.
      fotoOCv: prisma.person.count({
        where: { OR: [{ photoMediaId: id }, { cvMediaId: id }], isSiteOwner: true },
      }),
      logoDeInstitucion: prisma.institution.count({ where: { logoMediaId: id, isActive: true } }),
      heroDePagina: prisma.pageContent.count({ where: { heroMediaId: id, isPublished: true } }),
      ogDelSitio: prisma.siteSettings.count({ where: { ogImageMediaId: id } }),
      // El emblema esta en la cabecera de todas las paginas: no cuelga de nada que
      // pueda estar en borrador. La imagen del pie, igual.
      emblemaDelSitio: prisma.siteSettings.count({ where: { logoMediaId: id } }),
      imagenDelPie: prisma.siteSettings.count({ where: { footerMediaId: id } }),
      // El fondo de una seccion no se condiciona a que su pagina este publicada: las
      // fichas de detalle heredan el fondo de la cabecera de su listado y se siguen
      // abriendo aunque el listado este oculto.
      fondoDeSeccion: prisma.pageSection.count({ where: { backgroundMediaId: id } }),
      // La imagen de un evento publicado. Faltaba: la agenda entregaba su direccion y
      // la descarga respondia 404, asi que el hueco se pintaba vacio.
      imagenDeEvento: prisma.event.count({
        where: { imageMediaId: id, editorialStatus: 'published' },
      }),
      // La imagen de una noticia o entrada publicada. En borrador no se sirve (RN-001).
      imagenDePost: prisma.post.count({
        where: { imageMediaId: id, editorialStatus: 'published' },
      }),
      // Y sus adjuntos, que ademas pueden marcarse privados uno a uno.
      adjuntoDePost: prisma.postFile.count({
        where: { mediaId: id, isPublic: true, post: { editorialStatus: 'published' } },
      }),
      // El logotipo de un enlace del titular. Los enlaces salen en el pie de todas las
      // paginas y en la portada, asi que no cuelgan de nada que pueda estar en borrador:
      // basta con que el enlace sea publico y sea suyo.
      iconoDeEnlace: prisma.personLink.count({
        where: { iconMediaId: id, isPublic: true, person: { isSiteOwner: true } },
      }),
      // Intercalada en un texto largo que ya esta publicado. Sin esto, pegar una imagen
      // en el cuerpo de una entrada la dejaba respondiendo 404: se guardaba la direccion
      // y el archivo no se llegaba a servir.
      citadaEnTextoLargo: this.citasEnTextoLargo(id, true),
    }

    const recuentos = await Promise.all(Object.values(alcances))
    return recuentos.some((recuento) => recuento > 0)
  }
}
