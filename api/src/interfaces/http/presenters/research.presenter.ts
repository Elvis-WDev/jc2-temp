import type { PublicWorkSummary } from '../../../application/ports/repositories/PublicWorkRepository.js'
import type { PublicWorkDetail } from '../../../application/use-cases/research/PublicResearchUseCases.js'
import { doiToUrl } from '../../../domain/research/Doi.js'
import { extractoDeMarkdown } from '../../../shared/markdown/excerpt.js'
import { renderMarkdown } from '../../../shared/markdown/render.js'

/**
 * Capa 3 del blindaje (plan seccion 5).
 *
 * Nunca sale `editorialStatus`, `createdBy`, `updatedBy`, `archivedAt`,
 * `displayOrder` ni ningun identificador de almacenamiento. Lo que el visitante
 * necesita son URLs y etiquetas, no el estado interno del CMS.
 */

function mediaUrl(baseUrl: string, mediaId: string | null): string | null {
  return mediaId === null ? null : `${baseUrl}/api/public/media/${mediaId}`
}

export function toPublicWorkSummaryDto(work: PublicWorkSummary, baseUrl: string) {
  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    subtitle: work.subtitle,
    type: {
      code: work.workTypeCode,
      label: work.workTypeLabel,
      pluralLabel: work.workTypePluralLabel,
    },
    academicStatus: work.academicStatus,
    academicStatusLabel: work.academicStatusLabel,
    year: work.publicationYear,
    venue: work.venueName,
    venueAbbreviation: work.venueAbbreviation,
    venueRanking: work.venueRanking,
    volume: work.volume,
    issue: work.issue,
    doi: work.doi,
    doiUrl: work.doi === null ? null : doiToUrl(work.doi),
    isOpenAccess: work.isOpenAccess,
    authors: work.authors.map((autor) => autor.fullName),
    tags: work.tags,
    // El primer adjunto, para el boton de descarga rapida de la tarjeta. El tipo viaja
    // con el para poder rotularlo: «PDF» cuando lo es, «Download» cuando es otra cosa.
    mainFile:
      work.mainFile === null
        ? null
        : {
            url: mediaUrl(baseUrl, work.mainFile.mediaId) as string,
            type: work.mainFile.fileType,
            label: work.mainFile.label,
          },
    // Un extracto en texto plano, no el abstract entero ni su HTML: en la tarjeta caben
    // unas cinco lineas, y mandar dos mil caracteres por publicacion para recortarlos en
    // el navegador seria pagar el peso sin usarlo.
    abstractExcerpt: extractoDeMarkdown(work.abstractMarkdown, LARGO_DEL_EXTRACTO),
  }
}

/** Unas cinco lineas: lo justo para saber de que va sin tener que bajar. */
const LARGO_DEL_EXTRACTO = 420

export function toPublicWorkDetailDto(detalle: PublicWorkDetail, baseUrl: string) {
  const { work } = detalle

  return {
    id: work.id,
    slug: work.slug,
    title: work.title,
    subtitle: work.subtitle,
    type: { code: work.workTypeCode, label: work.workTypeLabel },
    academicStatus: work.academicStatus,
    academicStatusLabel: work.academicStatusLabel,
    abstractHtml: renderMarkdown(work.abstractMarkdown),
    descriptionHtml: renderMarkdown(work.descriptionMarkdown),
    year: work.publicationYear,
    publicationDate: work.publicationDate?.toISOString().slice(0, 10) ?? null,
    firstOnlineDate: work.firstOnlineDate?.toISOString().slice(0, 10) ?? null,
    venue: work.venueName,
    venueAbbreviation: work.venueAbbreviation,
    venueRanking: work.venueRanking,
    publisher: work.publisherName,
    volume: work.volume,
    issue: work.issue,
    pages: work.pages,
    articleNumber: work.articleNumber,
    doi: work.doi,
    doiUrl: work.doi === null ? null : doiToUrl(work.doi),
    isbn: work.isbn,
    issn: work.issn,
    language: work.languageCode,
    isOpenAccess: work.isOpenAccess,
    coverUrl: mediaUrl(baseUrl, work.coverMediaId),
    authors: work.authors.map((autor) => ({
      name: autor.fullName,
      order: autor.authorOrder,
      role: autor.contributionRole,
      isCorresponding: autor.isCorresponding,
    })),
    tags: work.tags.map((tag) => ({ slug: tag.slug, name: tag.name })),
    // El repositorio publico ya excluye los privados; aqui ademas se enumeran los
    // campos que salen, para no arrastrar nunca la fila entera.
    links: work.links.map((link) => ({
      type: link.linkType,
      // Lo que el editor escribio, y si no, el nombre del termino del catalogo. El
      // codigo crudo solo aparece si alguien importo un valor que no esta en ninguna
      // lista.
      label: link.label ?? detalle.termLabels.links[link.linkType] ?? link.linkType,
      url: link.url,
    })),
    // Las figuras salen aparte, como galeria: mezcladas con el PDF y los datos no se
    // pueden mostrar juntas, que es lo que se espera de una imagen.
    files: work.files
      .filter((archivo) => archivo.fileType !== 'figure')
      .map((archivo) => ({
        type: archivo.fileType,
        label: archivo.label ?? detalle.termLabels.files[archivo.fileType] ?? archivo.fileType,
        version: archivo.versionLabel,
        url: `${baseUrl}/api/public/media/${archivo.mediaId}`,
      })),
    figures: work.files
      .filter((archivo) => archivo.fileType === 'figure')
      .map((archivo) => ({
        label: archivo.label,
        url: `${baseUrl}/api/public/media/${archivo.mediaId}`,
      })),
    version: work.versionLabel,
    downloadCode: work.downloadCode,
    citation: detalle.citation,
    bibtex: detalle.bibtex,
  }
}
