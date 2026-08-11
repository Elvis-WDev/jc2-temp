import type { PersonLinkRecord } from '../../ports/repositories/PeopleRepository.js'
import type { SiteContentUseCases } from '../site/SiteContentUseCases.js'
import type { PublicEventUseCases } from '../events/EventUseCases.js'
import type { GetPublicProfile } from './GetPublicProfile.js'

/**
 * `GET /api/public/site`: lo que la cabecera y el pie necesitan en TODAS las paginas.
 *
 * Existe porque estos datos vivian dentro de `/api/public/home`, y eso obligaba a que
 * Research o Teaching pidieran la portada entera solo para pintar su pie. Aqui va lo
 * que no cambia de una pagina a otra; el cuerpo de cada pagina se pide aparte.
 *
 * Repite unos pocos campos del perfil —CV, correo, enlaces academicos— y es
 * deliberado: son los que salen en el pie. Quien necesite el perfil completo tiene
 * `/api/public/profile`.
 */
export interface PublicSite {
  siteName: string
  footerText: string | null
  contactEmail: string | null
  logoMediaId: string | null
  /** Valores por defecto para los metadatos de cada pagina (ERS §39). */
  meta: {
    title: string | null
    description: string | null
    ogImageMediaId: string | null
  }
  /**
   * Que paginas se ven. El menu del sitio se construye con esto.
   *
   * Eventos ademas necesita tener algo publicado: un menu que lleva a una pagina vacia
   * estorba tanto como uno que lleva a una pagina oculta.
   */
  pages: {
    research: boolean
    teaching: boolean
    events: boolean
  }
  /** Que bloques se pintan, por pagina y seccion: `research.filters`, `home.hero`... */
  sections: Record<string, boolean>
  /** El fondo de las secciones que tienen uno, con la misma clave. */
  sectionBackgrounds: Record<string, { mediaId: string; overlay: number }>
  owner: {
    fullName: string
    publicEmail: string | null
    orcid: string | null
    cvMediaId: string | null
    scholarUrls: {
      googleScholar: string | null
      scopus: string | null
      ssrn: string | null
      repec: string | null
      website: string | null
    }
    links: PersonLinkRecord[]
  }
}

export class GetPublicSite {
  constructor(
    private readonly siteContent: SiteContentUseCases,
    private readonly profile: GetPublicProfile,
    private readonly events: PublicEventUseCases,
  ) {}

  async execute(): Promise<PublicSite> {
    const [settings, perfil, hayEventos, visibilidad] = await Promise.all([
      this.siteContent.getSettings(),
      this.profile.execute(),
      this.events.hasPublished(),
      this.siteContent.getVisibility(),
    ])

    const persona = perfil.person

    return {
      siteName: settings.siteName,
      footerText: settings.footerText,
      contactEmail: settings.contactEmail,
      logoMediaId: settings.logoMediaId,
      meta: {
        title: settings.metaTitleDefault,
        description: settings.metaDescriptionDefault,
        ogImageMediaId: settings.ogImageMediaId,
      },
      pages: {
        research: visibilidad.pages.research ?? true,
        teaching: visibilidad.pages.teaching ?? true,
        events: (visibilidad.pages.events ?? true) && hayEventos,
      },
      sections: visibilidad.sections,
      sectionBackgrounds: visibilidad.backgrounds,
      owner: {
        fullName: persona.fullName,
        publicEmail: persona.publicEmail,
        orcid: persona.orcid,
        cvMediaId: persona.cvMediaId,
        scholarUrls: {
          googleScholar: persona.googleScholarUrl,
          scopus: persona.scopusUrl,
          ssrn: persona.ssrnUrl,
          repec: persona.repecUrl,
          website: persona.websiteUrl,
        },
        // El repositorio ya filtra los no publicos.
        links: perfil.links,
      },
    }
  }
}
