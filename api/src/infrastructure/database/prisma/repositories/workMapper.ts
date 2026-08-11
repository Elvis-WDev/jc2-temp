import type { WorkRecord } from '../../../../application/ports/repositories/WorkRepository.js'

/** Include compartido por el repositorio administrativo y el publico. */
export const INCLUDE_WORK = {
  workType: { select: { id: true, code: true, label: true } },
  academicStatus: { select: { code: true, label: true, tone: true } },
  venue: { select: { id: true, name: true, abbreviation: true, ranking: true } },
  authors: {
    orderBy: { authorOrder: 'asc' },
    include: {
      person: { select: { id: true, fullName: true, givenName: true, familyName: true } },
    },
  },
  tags: { include: { tag: { select: { id: true, slug: true, name: true } } } },
  links: { orderBy: { sortOrder: 'asc' } },
  files: { orderBy: { sortOrder: 'asc' } },
} as const

type FilaConRelaciones = Parameters<typeof mapWork>[0]

/**
 * Traduce la fila de Prisma a la entidad que maneja la aplicacion.
 *
 * Es el limite del que habla backend.md:74: a partir de aqui nadie ve la forma de
 * Prisma. Tipado laxo a proposito, porque el tipo generado con `include` anidado es
 * inmanejable de escribir a mano.
 */
export function mapWork(fila: {
  id: string
  workTypeId: string
  workType: { code: string; label: string }
  academicStatus: { code: string; label: string; tone: string }
  title: string
  subtitle: string | null
  slug: string
  abstractMarkdown: string | null
  descriptionMarkdown: string | null
  editorialStatus: string
  publicationDate: Date | null
  publicationYear: number | null
  firstOnlineDate: Date | null
  venueId: string | null
  venueName: string | null
  venue: { id: string; name: string; abbreviation: string | null; ranking: string | null } | null
  publisherName: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  articleNumber: string | null
  doi: string | null
  isbn: string | null
  issn: string | null
  languageCode: string | null
  coverMediaId: string | null
  citationTextOverride: string | null
  versionLabel: string | null
  downloadCode: string | null
  bibtexOverride: string | null
  isFeatured: boolean
  featuredOrder: number | null
  isCarousel: boolean
  carouselOrder: number | null
  displayOrder: number | null
  isOpenAccess: boolean
  publishedAt: Date | null
  archivedAt: Date | null
  authors: Array<{
    personId: string
    authorOrder: number
    contributionRole: string | null
    isCorresponding: boolean
    person: { fullName: string; givenName: string | null; familyName: string | null }
  }>
  tags: Array<{ tag: { id: string; slug: string; name: string } }>
  links: Array<{
    id: string
    linkType: string
    label: string | null
    url: string
    isPublic: boolean
  }>
  files: Array<{
    id: string
    mediaId: string
    fileType: string
    label: string | null
    versionLabel: string | null
    isPublic: boolean
  }>
}): WorkRecord {
  return {
    id: fila.id,
    workTypeId: fila.workTypeId,
    workTypeCode: fila.workType.code,
    workTypeLabel: fila.workType.label,
    title: fila.title,
    subtitle: fila.subtitle,
    slug: fila.slug,
    abstractMarkdown: fila.abstractMarkdown,
    descriptionMarkdown: fila.descriptionMarkdown,
    academicStatus: fila.academicStatus.code,
    academicStatusLabel: fila.academicStatus.label,
    academicStatusTone: fila.academicStatus.tone,
    editorialStatus: fila.editorialStatus,
    publicationDate: fila.publicationDate,
    publicationYear: fila.publicationYear,
    firstOnlineDate: fila.firstOnlineDate,
    venueId: fila.venueId,
    // El nombre sale de la ficha si la hay; si no, del texto suelto. Un trabajo tiene
    // una cosa o la otra, nunca las dos.
    venueName: fila.venue?.name ?? fila.venueName,
    venueAbbreviation: fila.venue?.abbreviation ?? null,
    venueRanking: fila.venue?.ranking ?? null,
    publisherName: fila.publisherName,
    volume: fila.volume,
    issue: fila.issue,
    pages: fila.pages,
    articleNumber: fila.articleNumber,
    doi: fila.doi,
    isbn: fila.isbn,
    issn: fila.issn,
    languageCode: fila.languageCode,
    coverMediaId: fila.coverMediaId,
    citationTextOverride: fila.citationTextOverride,
    versionLabel: fila.versionLabel,
    downloadCode: fila.downloadCode,
    bibtexOverride: fila.bibtexOverride,
    isFeatured: fila.isFeatured,
    featuredOrder: fila.featuredOrder,
    isCarousel: fila.isCarousel,
    carouselOrder: fila.carouselOrder,
    displayOrder: fila.displayOrder,
    isOpenAccess: fila.isOpenAccess,
    publishedAt: fila.publishedAt,
    archivedAt: fila.archivedAt,
    authors: fila.authors.map((autor) => ({
      personId: autor.personId,
      fullName: autor.person.fullName,
      givenName: autor.person.givenName,
      familyName: autor.person.familyName,
      authorOrder: autor.authorOrder,
      contributionRole: autor.contributionRole,
      isCorresponding: autor.isCorresponding,
    })),
    tags: fila.tags.map((relacion) => relacion.tag),
    links: fila.links,
    files: fila.files,
  }
}

export type WorkRowWithRelations = FilaConRelaciones
