import { Router } from 'express'
import type { AffiliationUseCases } from '../../../../application/use-cases/people/AffiliationUseCases.js'
import type { PersonLinkUseCases } from '../../../../application/use-cases/people/PersonLinkUseCases.js'
import type { PersonUseCases } from '../../../../application/use-cases/people/PersonUseCases.js'
import type { DepartmentUseCases } from '../../../../application/use-cases/institutions/DepartmentUseCases.js'
import type { InstitutionUseCases } from '../../../../application/use-cases/institutions/InstitutionUseCases.js'
import type { SiteContentUseCases } from '../../../../application/use-cases/site/SiteContentUseCases.js'
import type { PageKey } from '../../../../application/ports/repositories/SiteContentRepository.js'
import { toAffiliationDto } from '../../presenters/profile.presenter.js'
import { validate, validated } from '../../middlewares/validate.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'
import {
  affiliationBodySchema,
  affiliationPatchSchema,
  affiliationQuerySchema,
  departmentBodySchema,
  departmentPatchSchema,
  departmentQuerySchema,
  idParamsSchema,
  institutionBodySchema,
  institutionPatchSchema,
  listQuerySchema,
  pageContentPatchSchema,
  pageKeyParamsSchema,
  pageSectionPatchSchema,
  pageSectionQuerySchema,
  personBodySchema,
  personLinkBodySchema,
  personLinkPatchSchema,
  personPatchSchema,
  siteSettingsPatchSchema,
} from '../../schemas/profile.schemas.js'

export interface ProfileRouterDeps {
  institutions: InstitutionUseCases
  departments: DepartmentUseCases
  persons: PersonUseCases
  personLinks: PersonLinkUseCases
  affiliations: AffiliationUseCases
  siteContent: SiteContentUseCases
}

type ListQuery = { page: number; page_size: number; q?: string; active?: boolean }

/**
 * Rutas administrativas de perfil, instituciones y contenido de paginas.
 *
 * Cuelgan del router admin, que ya aplica `requireAdmin`: aqui no se vuelve a
 * comprobar la sesion, y no hay ninguna ruta que pueda quedarse sin proteger.
 */
export function createProfileRouter(deps: ProfileRouterDeps): Router {
  const router = Router()

  // --- Instituciones ---
  router.get(
    '/institutions',
    validate({ query: listQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<unknown, ListQuery>(req)
      return deps.institutions.list(query, {
        active: query.active ?? null,
        search: query.q ?? null,
      })
    }),
  )

  router.post(
    '/institutions',
    validate({ body: institutionBodySchema }),
    jsonHandler((req) => deps.institutions.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.get(
    '/institutions/:id',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.institutions.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/institutions/:id',
    validate({ params: idParamsSchema, body: institutionPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.institutions.update(params.id, body)
    }),
  )

  router.delete(
    '/institutions/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.institutions.delete(validated<{ id: string }>(req).params.id)),
  )

  router.post(
    '/institutions/:id/deactivate',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.institutions.deactivate(validated<{ id: string }>(req).params.id)),
  )

  // --- Departamentos ---
  router.get(
    '/departments',
    validate({ query: departmentQuerySchema }),
    jsonHandler((req) => {
      const { query } = validated<unknown, { institutionId?: string }>(req)
      return deps.departments.list(query.institutionId ?? null)
    }),
  )

  router.post(
    '/departments',
    validate({ body: departmentBodySchema }),
    jsonHandler((req) => deps.departments.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.patch(
    '/departments/:id',
    validate({ params: idParamsSchema, body: departmentPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.departments.update(params.id, body)
    }),
  )

  router.delete(
    '/departments/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.departments.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Perfil del titular ---
  router.get(
    '/profile',
    jsonHandler(() => deps.persons.getSiteOwner()),
  )

  router.patch(
    '/profile',
    validate({ body: personPatchSchema }),
    jsonHandler((req) =>
      deps.persons.updateSiteOwner(validated<unknown, unknown, never>(req).body),
    ),
  )

  // --- Personas (coautores) ---
  router.get(
    '/persons',
    validate({ query: listQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<unknown, ListQuery>(req)
      return deps.persons.list(query, { search: query.q ?? null })
    }),
  )

  router.post(
    '/persons',
    validate({ body: personBodySchema }),
    jsonHandler((req) => deps.persons.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.get(
    '/persons/:id',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.persons.get(validated<{ id: string }>(req).params.id)),
  )

  router.patch(
    '/persons/:id',
    validate({ params: idParamsSchema, body: personPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.persons.update(params.id, body)
    }),
  )

  router.delete(
    '/persons/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.persons.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Enlaces de una persona ---
  router.get(
    '/person-links',
    validate({ query: affiliationQuerySchema.pick({ personId: true }) }),
    jsonHandler((req) =>
      deps.personLinks.list(validated<unknown, { personId: string }>(req).query.personId, false),
    ),
  )

  router.post(
    '/person-links',
    validate({ body: personLinkBodySchema }),
    jsonHandler((req) => deps.personLinks.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.patch(
    '/person-links/:id',
    validate({ params: idParamsSchema, body: personLinkPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.personLinks.update(params.id, body)
    }),
  )

  router.delete(
    '/person-links/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.personLinks.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Afiliaciones ---
  router.get(
    '/affiliations',
    validate({ query: affiliationQuerySchema }),
    jsonHandler((req) => {
      const { query } = validated<unknown, { personId: string; current?: boolean }>(req)
      return deps.affiliations
        .list(query.personId, query.current === true)
        .then((filas) => filas.map(toAffiliationDto))
    }),
  )

  router.post(
    '/affiliations',
    validate({ body: affiliationBodySchema }),
    jsonHandler(
      (req) =>
        deps.affiliations
          .create(validated<unknown, unknown, never>(req).body)
          .then(toAffiliationDto),
      { status: 201 },
    ),
  )

  router.patch(
    '/affiliations/:id',
    validate({ params: idParamsSchema, body: affiliationPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.affiliations.update(params.id, body).then(toAffiliationDto)
    }),
  )

  router.delete(
    '/affiliations/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.affiliations.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Contenido de paginas y configuracion ---
  router.get(
    '/page-content',
    jsonHandler(() => deps.siteContent.listPages()),
  )

  router.get(
    '/page-content/:pageKey',
    validate({ params: pageKeyParamsSchema }),
    jsonHandler((req) =>
      deps.siteContent.getPage(validated<{ pageKey: PageKey }>(req).params.pageKey),
    ),
  )

  router.patch(
    '/page-content/:pageKey',
    validate({ params: pageKeyParamsSchema, body: pageContentPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ pageKey: PageKey }, unknown, never>(req)
      return deps.siteContent.updatePage(params.pageKey, body, req.auth?.id ?? null)
    }),
  )

  // --- Secciones ---
  //
  // No se crean ni se borran: las define el codigo. Solo se encienden y se apagan.
  router.get(
    '/page-sections',
    validate({ query: pageSectionQuerySchema }),
    jsonHandler((req) => {
      const { query } = validated<unknown, { page?: PageKey }>(req)
      return deps.siteContent.listSections(query.page ?? null)
    }),
  )

  router.patch(
    '/page-sections/:id',
    validate({ params: idParamsSchema, body: pageSectionPatchSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<
        { id: string },
        unknown,
        {
          isVisible?: boolean
          heading?: string | null
          headingAside?: string | null
          backgroundMediaId?: string | null
          backgroundOverlay?: number
        }
      >(req)
      return deps.siteContent.updateSection(params.id, body)
    }),
  )

  router.get(
    '/site-settings',
    jsonHandler(() => deps.siteContent.getSettings()),
  )

  router.patch(
    '/site-settings',
    validate({ body: siteSettingsPatchSchema }),
    jsonHandler((req) =>
      deps.siteContent.updateSettings(
        validated<unknown, unknown, never>(req).body,
        req.auth?.id ?? null,
      ),
    ),
  )

  return router
}
