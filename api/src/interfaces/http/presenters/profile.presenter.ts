import type { PublicProfile } from '../../../application/use-cases/public/GetPublicProfile.js'
import type {
  AffiliationRecord,
  PersonLinkRecord,
  PersonRecord,
} from '../../../application/ports/repositories/PeopleRepository.js'
import type { PageContentRecord } from '../../../application/ports/repositories/SiteContentRepository.js'
import { renderMarkdown } from '../../../shared/markdown/render.js'
import { toCalendarDate } from '../schemas/common.schemas.js'

/**
 * Capa 3 del blindaje (plan seccion 5): lista blanca explicita.
 *
 * La version publica del perfil NO expone `id`, `isSiteOwner`, `sortName` ni los
 * identificadores de media en crudo. En su lugar entrega URLs ya construidas, para
 * que el frontend no tenga que conocer como se sirven los archivos
 * (frontend.md:60-65).
 */

function mediaUrl(baseUrl: string, mediaId: string | null): string | null {
  return mediaId === null ? null : `${baseUrl}/api/public/media/${mediaId}`
}

export interface PublicProfileDto {
  fullName: string
  preferredName: string | null
  professionalTitle: string | null
  currentPosition: string | null
  shortBio: string | null
  /** HTML ya saneado (ERS §37): el cliente no tiene que acordarse de sanear. */
  fullBioHtml: string | null
  researchStatementHtml: string | null
  publicEmail: string | null
  city: string | null
  countryCode: string | null
  photoUrl: string | null
  cvUrl: string | null
  orcid: string | null
  scholarUrls: {
    googleScholar: string | null
    scopus: string | null
    ssrn: string | null
    repec: string | null
    website: string | null
  }
  primaryAffiliation: {
    title: string
    institution: string
    department: string | null
  } | null
  links: Array<{ type: string; label: string | null; url: string; iconKey: string | null }>
}

export function toPublicProfileDto(profile: PublicProfile, baseUrl: string): PublicProfileDto {
  const p = profile.person

  return {
    fullName: p.fullName,
    preferredName: p.preferredName,
    professionalTitle: p.professionalTitle,
    currentPosition: p.currentPosition,
    shortBio: p.shortBio,
    fullBioHtml: renderMarkdown(p.fullBioMarkdown),
    researchStatementHtml: renderMarkdown(p.researchStatementMarkdown),
    publicEmail: p.publicEmail,
    city: p.city,
    countryCode: p.countryCode,
    photoUrl: mediaUrl(baseUrl, p.photoMediaId),
    cvUrl: mediaUrl(baseUrl, p.cvMediaId),
    orcid: p.orcid,
    scholarUrls: {
      googleScholar: p.googleScholarUrl,
      scopus: p.scopusUrl,
      ssrn: p.ssrnUrl,
      repec: p.repecUrl,
      website: p.websiteUrl,
    },
    primaryAffiliation:
      profile.primaryAffiliation === null
        ? null
        : {
            title: profile.primaryAffiliation.title,
            institution: profile.primaryAffiliation.institutionName,
            department: profile.primaryAffiliation.departmentName,
          },
    links: profile.links.map(toPublicLinkDto),
  }
}

function toPublicLinkDto(link: PersonLinkRecord) {
  return { type: link.linkType, label: link.label, url: link.url, iconKey: link.iconKey }
}

/** Version administrativa: aqui si hacen falta los identificadores para editar. */
export function toAdminPersonDto(person: PersonRecord): PersonRecord {
  return person
}

export function toPageContentDto(page: PageContentRecord, baseUrl: string) {
  return {
    pageKey: page.pageKey,
    pageTitle: page.pageTitle,
    eyebrow: page.eyebrow,
    introHtml: renderMarkdown(page.introMarkdown),
    secondaryHtml: renderMarkdown(page.secondaryMarkdown),
    heroUrl: mediaUrl(baseUrl, page.heroMediaId),
    heroAlt: page.heroAlt,
  }
}

/**
 * Afiliacion para el panel.
 *
 * Las fechas salen como el dia que se escribio, no como un instante: la columna es
 * `date` y el formulario envia `AAAA-MM-DD`. Devolver el ISO completo obligaria a
 * recortarlo en el cliente y haria que leer y volver a guardar sin tocar nada
 * cambiara el formato.
 */
export function toAffiliationDto(afiliacion: AffiliationRecord) {
  return {
    id: afiliacion.id,
    personId: afiliacion.personId,
    institutionId: afiliacion.institutionId,
    institutionName: afiliacion.institutionName,
    departmentId: afiliacion.departmentId,
    departmentName: afiliacion.departmentName,
    title: afiliacion.title,
    affiliationType: afiliacion.affiliationType,
    startDate: toCalendarDate(afiliacion.startDate),
    endDate: toCalendarDate(afiliacion.endDate),
    isPrimary: afiliacion.isPrimary,
    isCurrent: afiliacion.isCurrent,
    descriptionMarkdown: afiliacion.descriptionMarkdown,
    sortOrder: afiliacion.sortOrder,
  }
}
