import type {
  PageContentInput,
  PageContentRecord,
  PageKey,
  PageSectionInput,
  PageSectionRecord,
  SiteContentRepository,
  SiteSettingsInput,
  SiteSettingsRecord,
} from '../../../../application/ports/repositories/SiteContentRepository.js'
import { NotFoundError } from '../../../../shared/errors/AppError.js'
import { prisma } from '../client.js'

const CAMPOS_PAGINA = {
  id: true,
  pageKey: true,
  pageTitle: true,
  eyebrow: true,
  introMarkdown: true,
  secondaryMarkdown: true,
  heroMediaId: true,
  heroAlt: true,
  isPublished: true,
} as const

const CAMPOS_SECCION = {
  id: true,
  pageKey: true,
  sectionKey: true,
  isVisible: true,
  backgroundMediaId: true,
  backgroundOverlay: true,
  sortOrder: true,
} as const

const CAMPOS_SETTINGS = {
  id: true,
  siteName: true,
  ownerPersonId: true,
  defaultLocale: true,
  timezone: true,
  publicBaseUrl: true,
  contactEmail: true,
  metaTitleDefault: true,
  metaDescriptionDefault: true,
  ogImageMediaId: true,
  logoMediaId: true,
  footerText: true,
} as const

export class PrismaSiteContentRepository implements SiteContentRepository {
  findPage(pageKey: PageKey): Promise<PageContentRecord | null> {
    return prisma.pageContent.findUnique({ where: { pageKey }, select: CAMPOS_PAGINA })
  }

  listPages(): Promise<PageContentRecord[]> {
    return prisma.pageContent.findMany({ orderBy: { pageKey: 'asc' }, select: CAMPOS_PAGINA })
  }

  updatePage(
    pageKey: PageKey,
    input: PageContentInput,
    updatedBy: string | null,
  ): Promise<PageContentRecord> {
    return prisma.pageContent.update({
      where: { pageKey },
      data: { ...input, updatedBy },
      select: CAMPOS_PAGINA,
    })
  }

  listSections(pageKey: PageKey | null): Promise<PageSectionRecord[]> {
    return prisma.pageSection.findMany({
      where: pageKey === null ? {} : { pageKey },
      orderBy: [{ pageKey: 'asc' }, { sortOrder: 'asc' }],
      select: CAMPOS_SECCION,
    })
  }

  updateSection(id: string, input: PageSectionInput): Promise<PageSectionRecord> {
    return prisma.pageSection.update({
      where: { id },
      data: input,
      select: CAMPOS_SECCION,
    })
  }

  getSettings(): Promise<SiteSettingsRecord | null> {
    // Singleton garantizado por UNIQUE + CHECK sobre is_singleton en la migracion.
    return prisma.siteSettings.findFirst({ select: CAMPOS_SETTINGS })
  }

  async updateSettings(
    input: SiteSettingsInput,
    updatedBy: string | null,
  ): Promise<SiteSettingsRecord> {
    const actual = await prisma.siteSettings.findFirst({ select: { id: true } })
    if (actual === null) {
      throw new NotFoundError('Site settings are missing.', 'SITE_SETTINGS_NOT_FOUND')
    }

    return prisma.siteSettings.update({
      where: { id: actual.id },
      data: { ...input, updatedBy },
      select: CAMPOS_SETTINGS,
    })
  }
}
