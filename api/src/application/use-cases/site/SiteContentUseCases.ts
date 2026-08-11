import { assertPageCanBeHidden, esVisible } from '../../../domain/site/PageRules.js'
import { NotFoundError } from '../../../shared/errors/AppError.js'
import type {
  PageContentInput,
  PageContentRecord,
  PageKey,
  PageSectionInput,
  PageSectionRecord,
  SiteContentRepository,
  SiteSettingsInput,
  SiteSettingsRecord,
} from '../../ports/repositories/SiteContentRepository.js'

/**
 * Textos de las tres paginas y configuracion global (ERS §25, §26).
 *
 * Las tres filas de `page_content` las crea el seeder y no se borran ni se crean por
 * API: son fijas por diseno (RF-020 prohibe un page-builder generico en el MVP).
 */
export class SiteContentUseCases {
  constructor(private readonly repo: SiteContentRepository) {}

  listPages(): Promise<PageContentRecord[]> {
    return this.repo.listPages()
  }

  async getPage(pageKey: PageKey): Promise<PageContentRecord> {
    const pagina = await this.repo.findPage(pageKey)
    if (pagina === null) {
      // Si falta, el seeder no llego a correr: es un fallo de despliegue, no una
      // peticion invalida.
      throw new NotFoundError(`Page content for "${pageKey}" is missing.`, 'PAGE_CONTENT_NOT_FOUND')
    }
    return pagina
  }

  /**
   * La pagina tal como la ve un visitante.
   *
   * Se separa de `getPage` a proposito: el panel tiene que poder leer una pagina que
   * todavia no esta publicada —es lo que edita antes de publicarla— y la web no. Sin
   * esta distincion, el interruptor "visible en la web" no hacia nada: una pagina
   * oculta se servia igual a cualquiera que supiera su direccion.
   */
  async getPublishedPage(pageKey: PageKey): Promise<PageContentRecord> {
    const pagina = await this.findPublishedPage(pageKey)
    if (pagina === null) {
      // Mismo error que si no existiera: que este oculta no es asunto del visitante.
      throw new NotFoundError(`Page content for "${pageKey}" is missing.`, 'PAGE_CONTENT_NOT_FOUND')
    }
    return pagina
  }

  /**
   * Igual que `getPublishedPage`, pero sin error cuando esta oculta.
   *
   * Lo usa la portada: si el titular oculta sus textos, lo que desaparece son los
   * textos, no la pagina entera con su perfil y sus destacados.
   */
  async findPublishedPage(pageKey: PageKey): Promise<PageContentRecord | null> {
    const pagina = await this.repo.findPage(pageKey)
    return pagina === null || !pagina.isPublished ? null : pagina
  }

  async updatePage(
    pageKey: PageKey,
    input: PageContentInput,
    updatedBy: string | null,
  ): Promise<PageContentRecord> {
    await this.getPage(pageKey)

    // La portada siempre esta visible. La regla es del dominio, no del formulario.
    if (input.isPublished === false) assertPageCanBeHidden(pageKey)

    return this.repo.updatePage(pageKey, input, updatedBy)
  }

  // --- Secciones ---

  listSections(pageKey: PageKey | null): Promise<PageSectionRecord[]> {
    return this.repo.listSections(pageKey)
  }

  updateSection(id: string, input: PageSectionInput): Promise<PageSectionRecord> {
    return this.repo.updateSection(id, input)
  }

  /**
   * Que se ve del sitio, resuelto de una vez.
   *
   * Una seccion se ve si su pagina se ve Y su interruptor esta encendido: apagar la
   * pagina apaga lo que hay dentro, sin tener que repetir la comprobacion en cada sitio.
   */
  async getVisibility(): Promise<{
    pages: Record<string, boolean>
    sections: Record<string, boolean>
    /** Solo las secciones que tienen fondo puesto: las demas se pintan lisas. */
    backgrounds: Record<string, { mediaId: string; overlay: number }>
  }> {
    const [paginas, secciones] = await Promise.all([
      this.repo.listPages(),
      this.repo.listSections(null),
    ])

    const pages: Record<string, boolean> = {}
    for (const pagina of paginas) pages[pagina.pageKey] = pagina.isPublished

    const sections: Record<string, boolean> = {}
    const backgrounds: Record<string, { mediaId: string; overlay: number }> = {}
    for (const seccion of secciones) {
      const paginaVisible = pages[seccion.pageKey] ?? true
      const clave = `${seccion.pageKey}.${seccion.sectionKey}`
      sections[clave] = paginaVisible && esVisible(secciones, seccion.pageKey, seccion.sectionKey)
      if (seccion.backgroundMediaId !== null) {
        backgrounds[clave] = {
          mediaId: seccion.backgroundMediaId,
          overlay: seccion.backgroundOverlay,
        }
      }
    }

    return { pages, sections, backgrounds }
  }

  async getSettings(): Promise<SiteSettingsRecord> {
    const settings = await this.repo.getSettings()
    if (settings === null) {
      throw new NotFoundError('Site settings are missing.', 'SITE_SETTINGS_NOT_FOUND')
    }
    return settings
  }

  async updateSettings(
    input: SiteSettingsInput,
    updatedBy: string | null,
  ): Promise<SiteSettingsRecord> {
    await this.getSettings()
    return this.repo.updateSettings(input, updatedBy)
  }
}
