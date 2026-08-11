import type { PublicSite } from '../../../application/use-cases/public/GetPublicSite.js'

/**
 * Capa 3 del blindaje: lista blanca explicita.
 *
 * Los identificadores de archivo no salen; en su lugar van las direcciones ya
 * construidas, para que el sitio no tenga que saber como se sirven los archivos
 * (frontend.md:60-65).
 */

function mediaUrl(baseUrl: string, mediaId: string | null): string | null {
  return mediaId === null ? null : `${baseUrl}/api/public/media/${mediaId}`
}

/**
 * Los fondos, ya con su direccion.
 *
 * Solo salen las secciones que tienen uno: las demas se pintan lisas y no necesitan
 * ninguna entrada. `overlay` viaja con la imagen porque la capa oscura solo tiene
 * sentido si hay algo debajo que oscurecer.
 */
function fondosDeSeccion(
  fondos: PublicSite['sectionBackgrounds'],
  baseUrl: string,
): Record<string, { url: string; overlay: number }> {
  const salida: Record<string, { url: string; overlay: number }> = {}
  for (const [clave, fondo] of Object.entries(fondos)) {
    salida[clave] = {
      url: `${baseUrl}/api/public/media/${fondo.mediaId}`,
      overlay: fondo.overlay,
    }
  }
  return salida
}

export function toPublicSiteDto(site: PublicSite, baseUrl: string) {
  return {
    siteName: site.siteName,
    footerText: site.footerText,
    contactEmail: site.contactEmail,
    logoUrl: mediaUrl(baseUrl, site.logoMediaId),
    meta: {
      title: site.meta.title,
      description: site.meta.description,
      ogImageUrl: mediaUrl(baseUrl, site.meta.ogImageMediaId),
    },
    pages: site.pages,
    sections: site.sections,
    sectionBackgrounds: fondosDeSeccion(site.sectionBackgrounds, baseUrl),
    owner: {
      fullName: site.owner.fullName,
      publicEmail: site.owner.publicEmail,
      orcid: site.owner.orcid,
      cvUrl: mediaUrl(baseUrl, site.owner.cvMediaId),
      scholarUrls: site.owner.scholarUrls,
      links: site.owner.links.map((link) => ({
        type: link.linkType,
        label: link.label,
        url: link.url,
        iconKey: link.iconKey,
      })),
    },
  }
}
