import { z } from '../openapi/registry.js'
import { calendarDateSchema, patchSchemaOf } from './common.schemas.js'

export const workIdParamsSchema = z.object({ id: z.uuid() })

/** Acepta id o slug: el slug existe desde el dia uno (ERS §2.1). */
export const workRefParamsSchema = z.object({ idOrSlug: z.string().trim().min(1).max(260) })

export const publicResearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  type: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  year_from: z.coerce.number().int().min(1800).max(2200).optional(),
  year_to: z.coerce.number().int().min(1800).max(2200).optional(),
  tag: z.string().trim().max(140).optional(),
  sort: z.enum(['newest', 'oldest', 'title', 'relevance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminWorkQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
})

const authorSchema = z.object({
  personId: z.uuid(),
  authorOrder: z.number().int().min(1),
  contributionRole: z.string().trim().max(80).nullable().optional(),
  isCorresponding: z.boolean().optional(),
})

const linkSchema = z.object({
  linkType: z.string().trim().min(1).max(50),
  label: z.string().trim().max(120).nullable().optional(),
  url: z.url(),
  sortOrder: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
})

const fileSchema = z.object({
  mediaId: z.uuid(),
  fileType: z.string().trim().min(1).max(50),
  label: z.string().trim().max(150).nullable().optional(),
  versionLabel: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
})

export const workCreateSchema = z.object({
  workTypeId: z.uuid(),
  title: z.string().trim().min(1).max(1000),
  subtitle: z.string().trim().max(1000).nullable().optional(),
  slug: z.string().trim().max(260).default(''),
  abstractMarkdown: z.string().max(50000).nullable().optional(),
  descriptionMarkdown: z.string().max(50000).nullable().optional(),
  // Ya no es una lista cerrada: el titular crea los estados que necesite. Que el
  // codigo exista lo comprueba el repositorio, que devuelve 404 con el codigo pedido.
  academicStatus: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use lowercase words separated by underscores.'),
  publicationDate: calendarDateSchema.nullable().optional(),
  publicationYear: z.number().int().nullable().optional(),
  // Ficha o texto suelto, nunca los dos: lo comprueba el caso de uso.
  venueId: z.uuid().nullable().optional(),
  venueName: z.string().trim().max(300).nullable().optional(),
  publisherName: z.string().trim().max(300).nullable().optional(),
  volume: z.string().trim().max(50).nullable().optional(),
  issue: z.string().trim().max(50).nullable().optional(),
  pages: z.string().trim().max(50).nullable().optional(),
  articleNumber: z.string().trim().max(100).nullable().optional(),
  // Se acepta en cualquiera de sus formas; el dominio lo normaliza (RN-009).
  doi: z.string().trim().max(255).nullable().optional(),
  isbn: z.string().trim().max(50).nullable().optional(),
  issn: z.string().trim().max(50).nullable().optional(),
  languageCode: z.string().trim().max(10).nullable().optional(),
  coverMediaId: z.uuid().nullable().optional(),
  citationTextOverride: z.string().max(5000).nullable().optional(),
  versionLabel: z.string().trim().max(50).nullable().optional(),
  downloadCode: z.string().trim().max(100).nullable().optional(),
  bibtexOverride: z.string().max(10000).nullable().optional(),
  displayOrder: z.number().int().nullable().optional(),
  isOpenAccess: z.boolean().optional(),
  authors: z.array(authorSchema).optional(),
  tagIds: z.array(z.uuid()).optional(),
  links: z.array(linkSchema).optional(),
  files: z.array(fileSchema).optional(),
})

export const workUpdateSchema = patchSchemaOf(workCreateSchema)

export const featuredBodySchema = z.object({
  isFeatured: z.boolean(),
  featuredOrder: z.number().int().min(0).nullable().default(null),
})

/** El carrusel de la portada. Seleccion aparte de los destacados. */
export const carouselBodySchema = z.object({
  isCarousel: z.boolean(),
  carouselOrder: z.number().int().min(0).nullable().default(null),
})
