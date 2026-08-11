import { Router, type Request } from 'express'
import type {
  CourseUseCases,
  TeachingActor,
} from '../../../../application/use-cases/teaching/CourseUseCases.js'
import { toAdminCourseDto, toAdminOfferingDto } from '../../presenters/teaching.presenter.js'
import { validate, validated } from '../../middlewares/validate.js'
import { registry } from '../../openapi/registry.js'
import { respuestaError } from '../../schemas/common.schemas.js'
import {
  adminCourseQuerySchema,
  courseCreateSchema,
  courseFeaturedBodySchema,
  courseIdParamsSchema,
  courseUpdateSchema,
  materialCreateSchema,
  materialUpdateSchema,
  offeringCreateSchema,
  offeringUpdateSchema,
} from '../../schemas/teaching.schemas.js'
import { jsonHandler, noContentHandler, paginatedHandler } from '../../support/handler.js'

registry.registerPath({
  method: 'post',
  path: '/api/admin/course-offerings/{id}/publish',
  summary: 'Publica una edicion de curso',
  description: 'Falla con 422 si el curso padre esta archivado o sigue en borrador (RN-005).',
  tags: ['Admin / Teaching'],
  responses: {
    200: { description: 'Publicada.' },
    401: respuestaError('Sin sesion.'),
    422: respuestaError('El curso no admite publicar ediciones.'),
  },
})

function actor(req: Request): TeachingActor {
  return { userId: req.auth?.id ?? null, ipAddress: req.ip ?? null }
}

export interface AdminTeachingRouterDeps {
  courses: CourseUseCases
}

/** Cursos, ediciones y materiales. Cuelga del router admin, ya protegido. */
export function createAdminTeachingRouter(deps: AdminTeachingRouterDeps): Router {
  const router = Router()

  // --- Cursos ---
  router.get(
    '/courses',
    validate({ query: adminCourseQuerySchema }),
    paginatedHandler((req) => {
      const { query } = validated<
        unknown,
        { page: number; page_size: number; q?: string; status?: string }
      >(req)
      return deps.courses
        .list(
          { page: query.page, page_size: query.page_size },
          { search: query.q ?? null, editorialStatus: query.status ?? null },
        )
        .then((pagina) => ({ ...pagina, items: pagina.items.map(toAdminCourseDto) }))
    }),
  )

  router.post(
    '/courses',
    validate({ body: courseCreateSchema }),
    jsonHandler(
      (req) =>
        deps.courses
          .create(validated<unknown, unknown, never>(req).body, actor(req))
          .then(toAdminCourseDto),
      { status: 201 },
    ),
  )

  router.get(
    '/courses/:id',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses.get(validated<{ id: string }>(req).params.id).then(toAdminCourseDto),
    ),
  )

  router.patch(
    '/courses/:id',
    validate({ params: courseIdParamsSchema, body: courseUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.courses.update(params.id, body, actor(req)).then(toAdminCourseDto)
    }),
  )

  router.delete(
    '/courses/:id',
    validate({ params: courseIdParamsSchema }),
    noContentHandler((req) =>
      deps.courses.delete(validated<{ id: string }>(req).params.id, actor(req)),
    ),
  )

  router.post(
    '/courses/:id/publish',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses
        .publish(validated<{ id: string }>(req).params.id, actor(req))
        .then(toAdminCourseDto),
    ),
  )

  router.post(
    '/courses/:id/archive',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses
        .archive(validated<{ id: string }>(req).params.id, actor(req))
        .then(toAdminCourseDto),
    ),
  )

  router.post(
    '/courses/:id/featured',
    validate({ params: courseIdParamsSchema, body: courseFeaturedBodySchema }),
    jsonHandler((req) => {
      const { params, body } = validated<
        { id: string },
        unknown,
        { isFeatured: boolean; featuredOrder: number | null }
      >(req)
      return deps.courses
        .setFeatured(params.id, body.isFeatured, body.featuredOrder)
        .then(toAdminCourseDto)
    }),
  )

  // --- Ediciones ---
  router.post(
    '/course-offerings',
    validate({ body: offeringCreateSchema }),
    jsonHandler(
      (req) =>
        deps.courses
          .createOffering(validated<unknown, unknown, never>(req).body)
          .then(toAdminOfferingDto),
      { status: 201 },
    ),
  )

  router.get(
    '/course-offerings/:id',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses.getOffering(validated<{ id: string }>(req).params.id).then(toAdminOfferingDto),
    ),
  )

  router.patch(
    '/course-offerings/:id',
    validate({ params: courseIdParamsSchema, body: offeringUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.courses.updateOffering(params.id, body).then(toAdminOfferingDto)
    }),
  )

  router.delete(
    '/course-offerings/:id',
    validate({ params: courseIdParamsSchema }),
    noContentHandler((req) =>
      deps.courses.deleteOffering(validated<{ id: string }>(req).params.id),
    ),
  )

  router.post(
    '/course-offerings/:id/publish',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses
        .publishOffering(validated<{ id: string }>(req).params.id)
        .then(toAdminOfferingDto),
    ),
  )

  router.post(
    '/course-offerings/:id/archive',
    validate({ params: courseIdParamsSchema }),
    jsonHandler((req) =>
      deps.courses
        .archiveOffering(validated<{ id: string }>(req).params.id)
        .then(toAdminOfferingDto),
    ),
  )

  // --- Materiales ---
  router.post(
    '/course-materials',
    validate({ body: materialCreateSchema }),
    jsonHandler(
      (req) => deps.courses.createMaterial(validated<unknown, unknown, never>(req).body),
      {
        status: 201,
      },
    ),
  )

  router.patch(
    '/course-materials/:id',
    validate({ params: courseIdParamsSchema, body: materialUpdateSchema }),
    jsonHandler((req) => {
      const { params, body } = validated<{ id: string }, unknown, never>(req)
      return deps.courses.updateMaterial(params.id, body)
    }),
  )

  router.delete(
    '/course-materials/:id',
    validate({ params: courseIdParamsSchema }),
    noContentHandler((req) =>
      deps.courses.deleteMaterial(validated<{ id: string }>(req).params.id),
    ),
  )

  return router
}
