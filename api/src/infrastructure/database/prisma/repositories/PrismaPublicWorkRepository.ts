import type {
  PublicWorkFilters,
  PublicWorkRepository,
  PublicWorkSummary,
  ResearchFacets,
} from '../../../../application/ports/repositories/PublicWorkRepository.js'
import type { WorkRecord } from '../../../../application/ports/repositories/WorkRepository.js'
import type { PaginationQuery } from '../../../../shared/http/pagination.js'
import { toSkipTake } from '../../../../shared/http/pagination.js'
import { prisma } from '../client.js'
import type { Prisma } from '../generated/client.js'
import { INCLUDE_WORK, mapWork } from './workMapper.js'
import { matchIdOrSlug } from '../../../../shared/uuid.js'

/**
 * Repositorio publico de Research.
 *
 * ESTA constante es la garantia de RN-001: se incrusta en el `where` de todas las
 * consultas de esta clase. El controlador no puede omitirla porque no la conoce.
 */
const SOLO_PUBLICADOS = { editorialStatus: 'published' } as const

const SELECT_RESUMEN = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  // El texto entero: recortarlo es cosa del presenter, que es quien sabe cuanto cabe.
  abstractMarkdown: true,
  academicStatus: { select: { code: true, label: true } },
  publicationYear: true,
  venueName: true,
  venue: { select: { name: true, abbreviation: true, ranking: true } },
  volume: true,
  issue: true,
  doi: true,
  isOpenAccess: true,
  workType: { select: { code: true, label: true, pluralLabel: true } },
  authors: {
    orderBy: { authorOrder: 'asc' },
    select: { authorOrder: true, person: { select: { fullName: true } } },
  },
  tags: { select: { tag: { select: { slug: true, name: true } } } },
  // Solo el PDF publico, no la lista de archivos (PERF-002).
  files: {
    where: { isPublic: true, fileType: 'paper_pdf' },
    select: { mediaId: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
} as const

type FilaResumen = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  abstractMarkdown: string | null
  academicStatus: { code: string; label: string }
  publicationYear: number | null
  venueName: string | null
  venue: { name: string; abbreviation: string | null; ranking: string | null } | null
  volume: string | null
  issue: string | null
  doi: string | null
  isOpenAccess: boolean
  workType: { code: string; label: string; pluralLabel: string }
  authors: Array<{ authorOrder: number; person: { fullName: string } }>
  tags: Array<{ tag: { slug: string; name: string } }>
  files: Array<{ mediaId: string }>
}

function mapResumen(fila: FilaResumen): PublicWorkSummary {
  return {
    id: fila.id,
    slug: fila.slug,
    title: fila.title,
    subtitle: fila.subtitle,
    workTypeCode: fila.workType.code,
    workTypeLabel: fila.workType.label,
    workTypePluralLabel: fila.workType.pluralLabel,
    academicStatus: fila.academicStatus.code,
    academicStatusLabel: fila.academicStatus.label,
    publicationYear: fila.publicationYear,
    venueName: fila.venue?.name ?? fila.venueName,
    venueAbbreviation: fila.venue?.abbreviation ?? null,
    venueRanking: fila.venue?.ranking ?? null,
    volume: fila.volume,
    issue: fila.issue,
    doi: fila.doi,
    isOpenAccess: fila.isOpenAccess,
    authors: fila.authors.map((a) => ({ fullName: a.person.fullName, authorOrder: a.authorOrder })),
    tags: fila.tags.map((t) => t.tag),
    pdfMediaId: fila.files[0]?.mediaId ?? null,
    abstractMarkdown: fila.abstractMarkdown,
  }
}

export class PrismaPublicWorkRepository implements PublicWorkRepository {
  /**
   * IDs que casan con la busqueda de texto, ordenados por relevancia.
   *
   * `websearch_to_tsquery` acepta la sintaxis que la gente ya conoce (comillas, OR,
   * -exclusion) y, a diferencia de `to_tsquery`, nunca lanza con entrada rara: no
   * hace falta sanear la cadena del usuario para evitar un 500.
   */
  private async idsPorTexto(q: string): Promise<string[]> {
    const filas = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM works
      WHERE editorial_status = 'published'
        AND search_vector @@ websearch_to_tsquery('english', ${q})
      ORDER BY ts_rank(search_vector, websearch_to_tsquery('english', ${q})) DESC
    `
    return filas.map((fila) => fila.id)
  }

  private async construirWhere(filtros: PublicWorkFilters): Promise<{
    where: Prisma.WorkWhereInput
    idsRelevancia: string[] | null
  }> {
    const idsRelevancia =
      filtros.q === null || filtros.q.trim() === '' ? null : await this.idsPorTexto(filtros.q)

    const where: Prisma.WorkWhereInput = {
      ...SOLO_PUBLICADOS,
      ...(filtros.type === null ? {} : { workType: { code: filtros.type } }),
      // El filtro publico `?status=` sigue usando el codigo, aunque por dentro sea una
      // relacion: las direcciones que ya circulen no se rompen.
      ...(filtros.status === null ? {} : { academicStatus: { code: filtros.status } }),
      ...(filtros.yearFrom === null && filtros.yearTo === null
        ? {}
        : {
            publicationYear: {
              ...(filtros.yearFrom === null ? {} : { gte: filtros.yearFrom }),
              ...(filtros.yearTo === null ? {} : { lte: filtros.yearTo }),
            },
          }),
      ...(filtros.tag === null ? {} : { tags: { some: { tag: { slug: filtros.tag } } } }),
      ...(idsRelevancia === null ? {} : { id: { in: idsRelevancia } }),
    }

    return { where, idsRelevancia }
  }

  private ordenar(sort: PublicWorkFilters['sort']): Prisma.WorkOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ publicationYear: 'asc' }, { createdAt: 'asc' }]
      case 'title':
        return [{ title: 'asc' }]
      case 'type':
        // El orden de los tipos lo decide el titular en el panel, no el codigo. Dentro
        // de cada uno manda RF-012, igual que en el orden por defecto: primero lo que
        // el titular haya colocado a mano, y el resto por ano descendente. Sin esta
        // linea el `display_order` del panel no hacia nada en el listado agrupado.
        return [
          { workType: { sortOrder: 'asc' } },
          { workType: { label: 'asc' } },
          { displayOrder: { sort: 'asc', nulls: 'last' } },
          { publicationYear: 'desc' },
          { createdAt: 'desc' },
        ]
      default:
        // RF-012: display_order explicito primero, luego ano descendente, luego alta.
        return [
          { displayOrder: { sort: 'asc', nulls: 'last' } },
          { publicationYear: 'desc' },
          { createdAt: 'desc' },
        ]
    }
  }

  async list(
    query: PaginationQuery,
    filtros: PublicWorkFilters,
  ): Promise<{ items: PublicWorkSummary[]; totalItems: number }> {
    const { where, idsRelevancia } = await this.construirWhere(filtros)

    // Sin coincidencias de texto no hay nada que pedir: se evita un IN vacio.
    if (idsRelevancia !== null && idsRelevancia.length === 0) {
      return { items: [], totalItems: 0 }
    }

    const { skip, take } = toSkipTake(query)
    const porRelevancia = filtros.sort === 'relevance' && idsRelevancia !== null

    const [filas, totalItems] = await Promise.all([
      prisma.work.findMany({
        where,
        // Con orden por relevancia se traen todos los candidatos y se pagina despues:
        // el ranking lo calculo PostgreSQL y Prisma no puede expresarlo en orderBy.
        ...(porRelevancia ? {} : { skip, take, orderBy: this.ordenar(filtros.sort) }),
        select: SELECT_RESUMEN,
      }),
      prisma.work.count({ where }),
    ])

    if (!porRelevancia) {
      return { items: filas.map(mapResumen), totalItems }
    }

    const posicion = new Map(idsRelevancia.map((id, indice) => [id, indice]))
    const ordenadas = [...filas].sort(
      (a, b) => (posicion.get(a.id) ?? 0) - (posicion.get(b.id) ?? 0),
    )

    return { items: ordenadas.slice(skip, skip + take).map(mapResumen), totalItems }
  }

  /**
   * Facets calculadas sobre el MISMO `where` que la lista, para que los recuentos
   * cuadren con lo que el usuario ve. Un facet sobre el conjunto sin filtrar
   * prometeria resultados que luego no aparecen.
   */
  async facets(filtros: PublicWorkFilters): Promise<ResearchFacets> {
    const { where, idsRelevancia } = await this.construirWhere(filtros)

    if (idsRelevancia !== null && idsRelevancia.length === 0) {
      return { types: [], statuses: [], years: [], tags: [] }
    }

    const [porTipo, porEstado, porAnio, porTag] = await Promise.all([
      prisma.work.groupBy({ by: ['workTypeId'], where, _count: { _all: true } }),
      prisma.work.groupBy({ by: ['academicStatusId'], where, _count: { _all: true } }),
      prisma.work.groupBy({ by: ['publicationYear'], where, _count: { _all: true } }),
      prisma.workTag.groupBy({ by: ['tagId'], where: { work: where }, _count: { _all: true } }),
    ])

    const [tipos, estados, tags] = await Promise.all([
      prisma.workType.findMany({
        where: { id: { in: porTipo.map((fila) => fila.workTypeId) } },
        select: { id: true, code: true, label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.academicStatus.findMany({
        where: { id: { in: porEstado.map((fila) => fila.academicStatusId) } },
        select: { id: true, code: true, label: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.tag.findMany({
        where: { id: { in: porTag.map((fila) => fila.tagId) } },
        select: { id: true, slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])

    const cuentaTipo = new Map(porTipo.map((fila) => [fila.workTypeId, fila._count._all]))
    const cuentaEstado = new Map(porEstado.map((fila) => [fila.academicStatusId, fila._count._all]))
    const cuentaTag = new Map(porTag.map((fila) => [fila.tagId, fila._count._all]))

    return {
      types: tipos.map((tipo) => ({
        code: tipo.code,
        label: tipo.label,
        count: cuentaTipo.get(tipo.id) ?? 0,
      })),
      // Ahora sale tambien la etiqueta: el filtro publico ya no tiene que traducir
      // codigos que el titular puede haber creado.
      statuses: estados.map((estado) => ({
        value: estado.code,
        label: estado.label,
        count: cuentaEstado.get(estado.id) ?? 0,
      })),
      years: porAnio
        .filter(
          (fila): fila is typeof fila & { publicationYear: number } =>
            fila.publicationYear !== null,
        )
        .map((fila) => ({ year: fila.publicationYear, count: fila._count._all }))
        .sort((a, b) => b.year - a.year),
      tags: tags.map((tag) => ({
        slug: tag.slug,
        name: tag.name,
        count: cuentaTag.get(tag.id) ?? 0,
      })),
    }
  }

  async findPublished(idOrSlug: string): Promise<WorkRecord | null> {
    const fila = await prisma.work.findFirst({
      // El filtro de publicacion va tambien aqui: un borrador no se abre ni sabiendo
      // su identificador exacto.
      where: { ...SOLO_PUBLICADOS, OR: matchIdOrSlug(idOrSlug) },
      include: {
        ...INCLUDE_WORK,
        // Los links y archivos privados no salen ni de la base de datos. Filtrarlos
        // solo en el presenter dejaria la puerta abierta a que un presenter futuro
        // se olvide; asi la consulta publica no los conoce.
        links: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' } },
        files: { where: { isPublic: true }, orderBy: { sortOrder: 'asc' } },
      },
    })

    return fila === null ? null : mapWork(fila)
  }
}
