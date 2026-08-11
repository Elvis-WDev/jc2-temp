import { Router } from 'express'
import type { GetAuditLog } from '../../../../application/use-cases/catalog/GetAuditLog.js'
import type { AcademicStatusUseCases } from '../../../../application/use-cases/catalog/AcademicStatusUseCases.js'
import type { CatalogTermUseCases } from '../../../../application/use-cases/catalog/CatalogTermUseCases.js'
import { WorkTypeUseCases } from '../../../../application/use-cases/catalog/WorkTypeUseCases.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry, z } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

const idParamsSchema = z.object({ id: z.uuid() })

const workTypeListQuerySchema = z.object({
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
})

const workTypeCreateSchema = z.object({
  code: z.string().trim().min(2).max(50),
  label: z.string().trim().min(1).max(100),
  pluralLabel: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).optional(),
  /** Cuantos de este tipo salen en la portada. Vacio: sin limite propio. */
  maxItemsHome: z.number().int().min(0).max(100).nullable().optional(),
})

/**
 * Vocabularios que el panel gestiona. Se valida aqui, en el borde, y no con un enum en
 * la base de datos: anadir un vocabulario nuevo no debe obligar a migrar.
 */
const CATALOGOS = [
  'work_link',
  'person_link',
  'work_file',
  'course_material',
  'affiliation',
  'venue',
  'event',
  'course_level',
] as const

const catalogTermListQuerySchema = z.object({
  catalog: z.enum(CATALOGOS).optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
})

const catalogTermCreateSchema = z.object({
  catalog: z.enum(CATALOGOS),
  // Mismo formato que el codigo de un tipo de trabajo: es lo que queda guardado en las
  // filas, asi que no admite espacios ni mayusculas.
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use lowercase words separated by underscores.'),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

const CODIGO = /^[a-z0-9]+(?:_[a-z0-9]+)*$/

const academicStatusCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(CODIGO, 'Use lowercase words separated by underscores.'),
  label: z.string().trim().min(1).max(100),
  tone: z.enum(['success', 'warning', 'danger', 'info', 'neutral']).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/** Sin `code`: viaja en la URL publica `?status=` y en todo lo ya guardado. */
const academicStatusUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  tone: z.enum(['success', 'warning', 'danger', 'info', 'neutral']).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

/** Ni `catalog` ni `code`: cambiarlos dejaria huerfanas las filas que ya los usan. */
const catalogTermUpdateSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

/** Sin `code`: es inmutable una vez creado. */
const workTypeUpdateSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  pluralLabel: z.string().trim().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
  maxItemsHome: z.number().int().min(0).max(100).nullable().optional(),
  isActive: z.boolean().optional(),
})

const auditQuerySchema = z.object({
  entityType: z.string().trim().max(80).optional(),
  entityId: z.uuid().optional(),
  userId: z.string().trim().max(64).optional(),
  action: z.string().trim().max(40).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

registry.registerPath({
  method: 'patch',
  path: '/api/admin/work-types/{id}',
  summary: 'Edita un tipo de trabajo',
  description:
    'El code es inmutable: lo usan el filtro publico ?type= y el mapeo a BibTeX. Se edita label, pluralLabel, sortOrder e isActive.',
  tags: ['Admin / Catalog'],
  responses: {
    200: { description: 'Actualizado.' },
    401: respuestaError('Sin sesion.'),
    404: respuestaError('No existe.'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/admin/audit-log',
  summary: 'Consulta la auditoria administrativa',
  description: 'Solo lectura. Filtrable por entidad, usuario y rango de fechas.',
  tags: ['Admin / Catalog'],
  responses: {
    200: { description: 'Entradas paginadas.' },
    401: respuestaError('Sin sesion.'),
  },
})

export interface AdminCatalogRouterDeps {
  workTypes: WorkTypeUseCases
  academicStatuses: AcademicStatusUseCases
  catalogTerms: CatalogTermUseCases
  auditLog: GetAuditLog
}

export function createAdminCatalogRouter(deps: AdminCatalogRouterDeps): Router {
  const router = Router()

  // --- Tipos de trabajo ---
  router.get(
    '/work-types',
    validate({ query: workTypeListQuerySchema }),
    jsonHandler((req) =>
      deps.workTypes.list(validated<unknown, { active?: boolean }>(req).query.active === true),
    ),
  )

  router.post(
    '/work-types',
    validate({ body: workTypeCreateSchema }),
    jsonHandler(
      (req) => {
        const { body } = validated<unknown, unknown, { code: string }>(req)
        // El formato del codigo es regla de dominio, no de transporte.
        WorkTypeUseCases.assertValidCode(body.code)
        return deps.workTypes.create(body as never)
      },
      { status: 201 },
    ),
  )

  router.patch(
    '/work-types/:id',
    validate({ params: idParamsSchema, body: workTypeUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.workTypes.update(params.id, body)
    }),
  )

  router.post(
    '/work-types/:id/deactivate',
    validate({ params: idParamsSchema }),
    jsonHandler((req) => deps.workTypes.deactivate(validated<{ id: string }>(req).params.id)),
  )

  router.delete(
    '/work-types/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.workTypes.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Estados academicos ---
  router.get(
    '/academic-statuses',
    validate({ query: workTypeListQuerySchema }),
    jsonHandler((req) =>
      deps.academicStatuses.list(
        validated<unknown, { active?: boolean }>(req).query.active === true,
      ),
    ),
  )

  router.post(
    '/academic-statuses',
    validate({ body: academicStatusCreateSchema }),
    jsonHandler(
      (req) => deps.academicStatuses.create(validated<unknown, unknown, never>(req).body),
      { status: 201 },
    ),
  )

  router.patch(
    '/academic-statuses/:id',
    validate({ params: idParamsSchema, body: academicStatusUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.academicStatuses.update(params.id, body)
    }),
  )

  router.delete(
    '/academic-statuses/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) =>
      deps.academicStatuses.delete(validated<{ id: string }>(req).params.id),
    ),
  )

  // --- Terminos de catalogo ---
  router.get(
    '/catalog-terms',
    validate({ query: catalogTermListQuerySchema }),
    jsonHandler((req) => {
      const { query } = validated<unknown, { catalog?: string; active?: boolean }>(req)
      return deps.catalogTerms.list(query.catalog ?? null, query.active === true)
    }),
  )

  router.post(
    '/catalog-terms',
    validate({ body: catalogTermCreateSchema }),
    jsonHandler((req) => deps.catalogTerms.create(validated<unknown, unknown, never>(req).body), {
      status: 201,
    }),
  )

  router.patch(
    '/catalog-terms/:id',
    validate({ params: idParamsSchema, body: catalogTermUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.catalogTerms.update(params.id, body)
    }),
  )

  router.delete(
    '/catalog-terms/:id',
    validate({ params: idParamsSchema }),
    noContentHandler((req) => deps.catalogTerms.delete(validated<{ id: string }>(req).params.id)),
  )

  // --- Auditoria (solo lectura) ---
  router.get(
    '/audit-log',
    validate({ query: auditQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        {
          page: number
          page_size: number
          entityType?: string
          entityId?: string
          userId?: string
          action?: string
          from?: string
          to?: string
        }
      >(req)

      return deps.auditLog.execute(
        { page: query.page, page_size: query.page_size },
        {
          entityType: query.entityType ?? null,
          entityId: query.entityId ?? null,
          userId: query.userId ?? null,
          action: query.action ?? null,
          from: query.from === undefined ? null : new Date(query.from),
          to: query.to === undefined ? null : new Date(query.to),
        },
      )
    }),
  )

  return router
}
