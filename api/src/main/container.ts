import type { AuditLogger } from '../application/ports/AuditLogger.js'
import type { SessionReader } from '../application/ports/SessionReader.js'
import type { StorageProvider } from '../application/ports/StorageProvider.js'
import type { UnitOfWork } from '../application/ports/UnitOfWork.js'
import { DepartmentUseCases } from '../application/use-cases/institutions/DepartmentUseCases.js'
import { InstitutionUseCases } from '../application/use-cases/institutions/InstitutionUseCases.js'
import { DeleteMedia } from '../application/use-cases/media/DeleteMedia.js'
import { GetMediaForDownload } from '../application/use-cases/media/GetMediaForDownload.js'
import { ListMedia } from '../application/use-cases/media/ListMedia.js'
import { UpdateMediaMetadata } from '../application/use-cases/media/UpdateMediaMetadata.js'
import { UploadMedia } from '../application/use-cases/media/UploadMedia.js'
import { AffiliationUseCases } from '../application/use-cases/people/AffiliationUseCases.js'
import { PersonLinkUseCases } from '../application/use-cases/people/PersonLinkUseCases.js'
import { PersonUseCases } from '../application/use-cases/people/PersonUseCases.js'
import { GetDashboardMetrics } from '../application/use-cases/admin/GetDashboardMetrics.js'
import { GetAuditLog } from '../application/use-cases/catalog/GetAuditLog.js'
import { AcademicStatusUseCases } from '../application/use-cases/catalog/AcademicStatusUseCases.js'
import {
  EventUseCases,
  PublicEventUseCases,
} from '../application/use-cases/events/EventUseCases.js'
import { CitationUseCases } from '../application/use-cases/citations/CitationUseCases.js'
import { VenueUseCases } from '../application/use-cases/research/VenueUseCases.js'
import type { AdminVenuesRouterDeps } from '../interfaces/http/routes/admin/venues.routes.js'
import type { AdminEventsRouterDeps } from '../interfaces/http/routes/admin/events.routes.js'
import type { AdminCitationsRouterDeps } from '../interfaces/http/routes/admin/citations.routes.js'
import type { PublicEventsRouterDeps } from '../interfaces/http/routes/public/events.routes.js'
import { CatalogTermUseCases } from '../application/use-cases/catalog/CatalogTermUseCases.js'
import { WorkTypeUseCases } from '../application/use-cases/catalog/WorkTypeUseCases.js'
import { GetHomePage } from '../application/use-cases/public/GetHomePage.js'
import { GetPublicSite } from '../application/use-cases/public/GetPublicSite.js'
import { GetSitemap } from '../application/use-cases/public/GetSitemap.js'
import { GetPublicProfile } from '../application/use-cases/public/GetPublicProfile.js'
import { PublicResearchUseCases } from '../application/use-cases/research/PublicResearchUseCases.js'
import { WorkUseCases } from '../application/use-cases/research/WorkUseCases.js'
import { SiteContentUseCases } from '../application/use-cases/site/SiteContentUseCases.js'
import { TagUseCases } from '../application/use-cases/tags/TagUseCases.js'
import { CourseUseCases } from '../application/use-cases/teaching/CourseUseCases.js'
import { PublicTeachingUseCases } from '../application/use-cases/teaching/PublicTeachingUseCases.js'
import { env } from '../config/env.js'
import { PrismaAuditLogger } from '../infrastructure/audit/PrismaAuditLogger.js'
import { BetterAuthSessionReader } from '../infrastructure/auth/better-auth/BetterAuthSessionReader.js'
import { auth, type Auth } from '../infrastructure/auth/better-auth/auth.js'
import { PrismaUnitOfWork } from '../infrastructure/database/prisma/PrismaUnitOfWork.js'
import { checkDatabaseConnection } from '../infrastructure/database/prisma/client.js'
import { PrismaAuditLogRepository } from '../infrastructure/database/prisma/repositories/PrismaAuditLogRepository.js'
import { PrismaCourseRepository } from '../infrastructure/database/prisma/repositories/PrismaCourseRepository.js'
import { PrismaDashboardRepository } from '../infrastructure/database/prisma/repositories/PrismaDashboardRepository.js'
import { PrismaInstitutionsRepository } from '../infrastructure/database/prisma/repositories/PrismaInstitutionsRepository.js'
import { PrismaMediaRepository } from '../infrastructure/database/prisma/repositories/PrismaMediaRepository.js'
import { PrismaPeopleRepository } from '../infrastructure/database/prisma/repositories/PrismaPeopleRepository.js'
import { PrismaPublicCourseRepository } from '../infrastructure/database/prisma/repositories/PrismaPublicCourseRepository.js'
import { PrismaPublicWorkRepository } from '../infrastructure/database/prisma/repositories/PrismaPublicWorkRepository.js'
import { PrismaWorkRepository } from '../infrastructure/database/prisma/repositories/PrismaWorkRepository.js'
import { PrismaSiteContentRepository } from '../infrastructure/database/prisma/repositories/PrismaSiteContentRepository.js'
import { PrismaTagRepository } from '../infrastructure/database/prisma/repositories/PrismaTagRepository.js'
import { PrismaAcademicStatusRepository } from '../infrastructure/database/prisma/repositories/PrismaAcademicStatusRepository.js'
import { PrismaCitationRepository } from '../infrastructure/database/prisma/repositories/PrismaCitationRepository.js'
import { PrismaEventRepository } from '../infrastructure/database/prisma/repositories/PrismaEventRepository.js'
import { PrismaVenueRepository } from '../infrastructure/database/prisma/repositories/PrismaVenueRepository.js'
import { PrismaCatalogRepository } from '../infrastructure/database/prisma/repositories/PrismaCatalogRepository.js'
import { PrismaWorkTypeRepository } from '../infrastructure/database/prisma/repositories/PrismaWorkTypeRepository.js'
import { CryptoIdGenerator } from '../infrastructure/id/CryptoIdGenerator.js'
import { MagicBytesFileTypeDetector } from '../infrastructure/storage/MagicBytesFileTypeDetector.js'
import { LocalStorageProvider } from '../infrastructure/storage/local/LocalStorageProvider.js'
import type { MediaControllerDeps } from '../interfaces/http/controllers/media.controller.js'
import type { ProfileRouterDeps } from '../interfaces/http/routes/admin/profile.routes.js'
import type { AdminDashboardRouterDeps } from '../interfaces/http/routes/admin/dashboard.routes.js'
import type { AdminCatalogRouterDeps } from '../interfaces/http/routes/admin/catalog.routes.js'
import type { AdminResearchRouterDeps } from '../interfaces/http/routes/admin/research.routes.js'
import type { AdminTagsRouterDeps } from '../interfaces/http/routes/admin/tags.routes.js'
import type { AdminTeachingRouterDeps } from '../interfaces/http/routes/admin/teaching.routes.js'
import type { PublicProfileRouterDeps } from '../interfaces/http/routes/public/profile.routes.js'
import type { PublicHomeRouterDeps } from '../interfaces/http/routes/public/home.routes.js'
import type { PublicSiteRouterDeps } from '../interfaces/http/routes/public/site.routes.js'
import type { PublicSitemapRouterDeps } from '../interfaces/http/routes/public/sitemap.routes.js'
import type { PublicResearchRouterDeps } from '../interfaces/http/routes/public/research.routes.js'
import type { PublicTeachingRouterDeps } from '../interfaces/http/routes/public/teaching.routes.js'

/**
 * Composition root: el unico lugar donde se eligen implementaciones concretas.
 *
 * Todo lo demas depende de puertos. Cambiar Better Auth, Prisma o el disco local por
 * otra cosa se resuelve aqui, sin tocar casos de uso ni controladores.
 */
export interface Container {
  auth: Auth
  sessionReader: SessionReader
  auditLogger: AuditLogger
  unitOfWork: UnitOfWork<unknown>
  storage: StorageProvider
  media: MediaControllerDeps
  profile: ProfileRouterDeps
  publicProfile: PublicProfileRouterDeps
  research: AdminResearchRouterDeps
  publicResearch: PublicResearchRouterDeps
  teaching: AdminTeachingRouterDeps
  publicTeaching: PublicTeachingRouterDeps
  home: PublicHomeRouterDeps
  site: PublicSiteRouterDeps
  sitemap: PublicSitemapRouterDeps
  dashboard: AdminDashboardRouterDeps
  tags: AdminTagsRouterDeps
  catalog: AdminCatalogRouterDeps
  venues: AdminVenuesRouterDeps
  events: AdminEventsRouterDeps
  citations: AdminCitationsRouterDeps
  publicEvents: PublicEventsRouterDeps
  checkDatabase: () => Promise<boolean>
}

export function buildContainer(): Container {
  const storage = new LocalStorageProvider(env.STORAGE_ROOT)
  const mediaRepository = new PrismaMediaRepository()
  const detector = new MagicBytesFileTypeDetector()
  const ids = new CryptoIdGenerator()

  const institutionsRepository = new PrismaInstitutionsRepository()
  const peopleRepository = new PrismaPeopleRepository()
  const siteContentRepository = new PrismaSiteContentRepository()

  const siteContent = new SiteContentUseCases(siteContentRepository)
  const auditLogger = new PrismaAuditLogger()
  // Se comparte entre la vista de administracion y la publica: es el mismo almacen, con
  // consultas distintas.
  const eventRepo = new PrismaEventRepository()

  // Se comparten instancias: Home compone los mismos casos de uso que sirven
  // /research y /teaching, en vez de duplicar la logica de destacados.
  const publicProfile = new GetPublicProfile(peopleRepository, institutionsRepository)
  const catalogRepository = new PrismaCatalogRepository()
  const publicEvents = new PublicEventUseCases(eventRepo, catalogRepository)
  const publicResearch = new PublicResearchUseCases(
    new PrismaPublicWorkRepository(),
    catalogRepository,
  )
  const publicTeaching = new PublicTeachingUseCases(
    new PrismaPublicCourseRepository(),
    catalogRepository,
  )

  return {
    auth,
    sessionReader: new BetterAuthSessionReader(auth),
    auditLogger,
    unitOfWork: new PrismaUnitOfWork(),
    storage,
    media: {
      uploadMedia: new UploadMedia(storage, mediaRepository, detector, ids),
      listMedia: new ListMedia(mediaRepository),
      updateMediaMetadata: new UpdateMediaMetadata(mediaRepository),
      deleteMedia: new DeleteMedia(mediaRepository, storage),
      getMediaForDownload: new GetMediaForDownload(mediaRepository, storage),
    },
    profile: {
      institutions: new InstitutionUseCases(institutionsRepository),
      departments: new DepartmentUseCases(institutionsRepository),
      persons: new PersonUseCases(peopleRepository),
      personLinks: new PersonLinkUseCases(peopleRepository),
      affiliations: new AffiliationUseCases(peopleRepository, institutionsRepository),
      siteContent,
    },
    publicProfile: {
      getPublicProfile: publicProfile,
      siteContent,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    research: { works: new WorkUseCases(new PrismaWorkRepository(), auditLogger) },
    publicResearch: {
      research: publicResearch,
      siteContent,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    teaching: {
      courses: new CourseUseCases(
        new PrismaCourseRepository(),
        institutionsRepository,
        auditLogger,
      ),
    },
    publicTeaching: {
      teaching: publicTeaching,
      siteContent,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    home: {
      home: new GetHomePage(
        publicProfile,
        siteContent,
        publicResearch,
        publicTeaching,
        publicEvents,
      ),
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    site: {
      site: new GetPublicSite(siteContent, publicProfile, publicEvents),
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    sitemap: {
      sitemap: new GetSitemap(publicResearch, publicTeaching, publicEvents, siteContent),
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    dashboard: { dashboard: new GetDashboardMetrics(new PrismaDashboardRepository()) },
    tags: { tags: new TagUseCases(new PrismaTagRepository()) },
    catalog: {
      workTypes: new WorkTypeUseCases(new PrismaWorkTypeRepository()),
      catalogTerms: new CatalogTermUseCases(catalogRepository),
      academicStatuses: new AcademicStatusUseCases(new PrismaAcademicStatusRepository()),
      auditLog: new GetAuditLog(new PrismaAuditLogRepository()),
    },
    venues: {
      venues: new VenueUseCases(new PrismaVenueRepository()),
    },
    events: {
      events: new EventUseCases(eventRepo, auditLogger),
    },
    citations: {
      citations: new CitationUseCases(new PrismaCitationRepository()),
    },
    publicEvents: {
      events: publicEvents,
      siteContent,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    checkDatabase: checkDatabaseConnection,
  }
}
