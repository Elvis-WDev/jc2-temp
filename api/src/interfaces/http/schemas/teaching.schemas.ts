import { z } from '../openapi/registry.js'
import { calendarDateSchema, patchSchemaOf } from './common.schemas.js'

export const courseIdParamsSchema = z.object({ id: z.uuid() })
export const courseRefParamsSchema = z.object({ idOrSlug: z.string().trim().min(1).max(220) })

export const publicTeachingQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  institution: z.string().trim().max(180).optional(),
  department: z.uuid().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
  tag: z.string().trim().max(140).optional(),
  sort: z.enum(['newest', 'title']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminCourseQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

/** ERS §21: sin institutionId ni departmentId. Eso pertenece a la edicion. */
export const courseCreateSchema = z.object({
  title: z.string().trim().min(1).max(300),
  shortTitle: z.string().trim().max(160).nullable().optional(),
  slug: z.string().trim().max(220).default(''),
  defaultCode: z.string().trim().max(80).nullable().optional(),
  level: z.string().trim().max(80).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  descriptionMarkdown: z.string().max(50000).nullable().optional(),
  coverMediaId: z.uuid().nullable().optional(),
  externalUrl: z.url().nullable().optional(),
  displayOrder: z.number().int().nullable().optional(),
  tagIds: z.array(z.uuid()).optional(),
})

export const courseUpdateSchema = patchSchemaOf(courseCreateSchema)

export const offeringCreateSchema = z.object({
  courseId: z.uuid(),
  institutionId: z.uuid(),
  departmentId: z.uuid().nullable().optional(),
  name: z.string().trim().max(250).nullable().optional(),
  courseCode: z.string().trim().max(80).nullable().optional(),
  term: z.string().trim().max(100).nullable().optional(),
  academicYear: z.number().int().min(1800).max(2200).nullable().optional(),
  startDate: calendarDateSchema.nullable().optional(),
  endDate: calendarDateSchema.nullable().optional(),
  teachingRole: z.string().trim().max(120).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  contentMarkdown: z.string().max(50000).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nullable().optional(),
  // Quien imparte la edicion. Se envia entera: la lista que llega sustituye a la que
  // habia, que es lo que hace un formulario al guardar.
  teachers: z
    .array(
      z.object({
        personId: z.uuid(),
        role: z.string().trim().max(120).nullable().optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
})

export const offeringUpdateSchema = offeringCreateSchema.partial().omit({ courseId: true })

export const materialCreateSchema = z.object({
  courseOfferingId: z.uuid(),
  // El XOR lo valida el dominio: aqui ambos son opcionales por separado.
  mediaId: z.uuid().nullable().default(null),
  externalUrl: z.url().nullable().default(null),
  materialType: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(250),
  description: z.string().max(5000).nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(false),
})

export const materialUpdateSchema = patchSchemaOf(materialCreateSchema).omit({
  courseOfferingId: true,
})

export const courseFeaturedBodySchema = z.object({
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().min(0).nullable().default(null),
})
