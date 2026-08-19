/** Contenido de las paginas del sitio y configuracion global (ERS §25, §26). */

/**
 * Todas las paginas que existen. La portada nunca se oculta.
 *
 * Es un conjunto cerrado a proposito: esto no es un constructor de paginas (RF-020).
 * El tipo se deriva de la lista, y no al reves, para que anadir una pagina sea tocar un
 * sitio y no dos que puedan discrepar.
 */
export const PAGE_KEYS = ['home', 'research', 'teaching', 'events', 'news', 'blog'] as const

export type PageKey = (typeof PAGE_KEYS)[number]

/**
 * Un bloque dentro de una pagina.
 *
 * Las claves las conoce el codigo: esto no es un constructor de paginas (RF-020), solo
 * guarda si cada bloque se ve y en que orden.
 */
export interface PageSectionRecord {
  id: string
  pageKey: string
  sectionKey: string
  isVisible: boolean
  /** Rotulo de la banda. `null` significa el que trae la plantilla. */
  heading: string | null
  /** El texto pequeno a su derecha. `null` significa el de la plantilla. */
  headingAside: string | null
  /** Fondo de la banda. Sin imagen, la seccion se pinta con su color liso. */
  backgroundMediaId: string | null
  /** Capa oscura sobre la imagen, de 0 a 100. */
  backgroundOverlay: number
  sortOrder: number
}

/** Lo que se puede cambiar de una seccion desde el panel. */
export interface PageSectionInput {
  isVisible?: boolean
  heading?: string | null
  headingAside?: string | null
  backgroundMediaId?: string | null
  backgroundOverlay?: number
}

export interface PageContentRecord {
  id: string
  pageKey: string
  pageTitle: string | null
  eyebrow: string | null
  introMarkdown: string | null
  secondaryMarkdown: string | null
  heroMediaId: string | null
  heroAlt: string | null
  isPublished: boolean
}

export type PageContentInput = Partial<Omit<PageContentRecord, 'id' | 'pageKey'>>

export interface SiteSettingsRecord {
  id: string
  siteName: string
  ownerPersonId: string
  defaultLocale: string
  timezone: string
  publicBaseUrl: string
  contactEmail: string | null
  metaTitleDefault: string | null
  metaDescriptionDefault: string | null
  ogImageMediaId: string | null
  /** Emblema de la cabecera del sitio. Vacio: se muestra el nombre. */
  logoMediaId: string | null
  /** Imagen de la primera columna del pie. */
  footerMediaId: string | null
  footerText: string | null
}

export type SiteSettingsInput = Partial<Omit<SiteSettingsRecord, 'id'>>

export interface SiteContentRepository {
  findPage(pageKey: PageKey): Promise<PageContentRecord | null>
  listPages(): Promise<PageContentRecord[]>
  updatePage(
    pageKey: PageKey,
    input: PageContentInput,
    updatedBy: string | null,
  ): Promise<PageContentRecord>

  listSections(pageKey: PageKey | null): Promise<PageSectionRecord[]>
  updateSection(id: string, input: PageSectionInput): Promise<PageSectionRecord>

  getSettings(): Promise<SiteSettingsRecord | null>
  updateSettings(input: SiteSettingsInput, updatedBy: string | null): Promise<SiteSettingsRecord>
}
