import { z } from '../openapi/registry.js'
import { calendarDateSchema, patchSchemaOf } from './common.schemas.js'

/** Esquemas de perfil, instituciones y contenido de paginas. */

export const idParamsSchema = z.object({ id: z.uuid() })

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  // Tres estados, no dos: sin el parametro salen todas, `true` solo las visibles y
  // `false` solo las ocultas. Antes `false` devolvia todas, asi que no habia forma de
  // encontrar lo que se habia ocultado.
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === 'true')),
})

// --- Instituciones ---

export const institutionBodySchema = z.object({
  name: z.string().trim().min(1).max(250),
  shortName: z.string().trim().max(100).nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens.'),
  websiteUrl: z.url().nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  logoMediaId: z.uuid().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  // Hexadecimal: es el color de marca de la institucion, no de la paleta del panel.
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1d4ed8.')
    .nullable()
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const institutionPatchSchema = institutionBodySchema.partial()

export const departmentBodySchema = z.object({
  institutionId: z.uuid(),
  name: z.string().trim().min(1).max(250),
  shortName: z.string().trim().max(120).nullable().optional(),
  slug: z.string().trim().min(1).max(180),
  websiteUrl: z.url().nullable().optional(),
  descriptionMarkdown: z.string().max(20000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const departmentPatchSchema = departmentBodySchema.partial()

export const departmentQuerySchema = z.object({
  institutionId: z.uuid().optional(),
})

// --- Personas ---

export const personBodySchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  givenName: z.string().trim().max(100).nullable().optional(),
  familyName: z.string().trim().max(100).nullable().optional(),
  preferredName: z.string().trim().max(150).nullable().optional(),
  professionalTitle: z.string().trim().max(200).nullable().optional(),
  currentPosition: z.string().trim().max(250).nullable().optional(),
  publicEmail: z.email().nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  countryCode: z.string().length(2).nullable().optional(),
  shortBio: z.string().max(2000).nullable().optional(),
  fullBioMarkdown: z.string().max(50000).nullable().optional(),
  researchStatementMarkdown: z.string().max(50000).nullable().optional(),
  photoMediaId: z.uuid().nullable().optional(),
  cvMediaId: z.uuid().nullable().optional(),
  orcid: z.string().trim().max(40).nullable().optional(),
  googleScholarUrl: z.url().nullable().optional(),
  scopusUrl: z.url().nullable().optional(),
  ssrnUrl: z.url().nullable().optional(),
  repecUrl: z.url().nullable().optional(),
  websiteUrl: z.url().nullable().optional(),
  sortName: z.string().trim().max(200).nullable().optional(),
})

export const personPatchSchema = personBodySchema.partial()

export const personLinkBodySchema = z.object({
  personId: z.uuid(),
  linkType: z.string().trim().min(1).max(50),
  label: z.string().trim().max(100).nullable().optional(),
  url: z.url(),
  iconKey: z.string().trim().max(50).nullable().optional(),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

export const personLinkPatchSchema = patchSchemaOf(personLinkBodySchema)

export const affiliationBodySchema = z.object({
  personId: z.uuid(),
  institutionId: z.uuid(),
  departmentId: z.uuid().nullable().optional(),
  title: z.string().trim().min(1).max(250),
  affiliationType: z.string().trim().max(50).nullable().optional(),
  startDate: calendarDateSchema.nullable().optional(),
  endDate: calendarDateSchema.nullable().optional(),
  isPrimary: z.boolean().default(false),
  isCurrent: z.boolean().default(false),
  descriptionMarkdown: z.string().max(20000).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
})

export const affiliationPatchSchema = patchSchemaOf(affiliationBodySchema)

export const affiliationQuerySchema = z.object({
  personId: z.uuid(),
  current: z
    .enum(['true', 'false'])
    .optional()
    .transform((valor) => valor === 'true'),
})

// --- Paginas y configuracion ---

export const pageKeyParamsSchema = z.object({
  pageKey: z.enum(['home', 'research', 'teaching', 'events']),
})

export const pageSectionQuerySchema = z.object({
  page: z.enum(['home', 'research', 'teaching', 'events']).optional(),
})

export const pageSectionPatchSchema = z
  .object({
    isVisible: z.boolean(),
    /** El fondo de la banda. `null` la devuelve a su color liso. */
    backgroundMediaId: z.uuid().nullable(),
    /** Capa oscura sobre la imagen, de 0 a 100. */
    backgroundOverlay: z.number().int().min(0).max(100),
  })
  .partial()

export const pageContentPatchSchema = z
  .object({
    pageTitle: z.string().trim().max(250).nullable(),
    eyebrow: z.string().trim().max(120).nullable(),
    introMarkdown: z.string().max(50000).nullable(),
    secondaryMarkdown: z.string().max(50000).nullable(),
    heroMediaId: z.uuid().nullable(),
    heroAlt: z.string().max(500).nullable(),
    isPublished: z.boolean(),
  })
  .partial()

export const siteSettingsPatchSchema = z
  .object({
    siteName: z.string().trim().min(1).max(200),
    defaultLocale: z.string().trim().max(10),
    timezone: z.string().trim().max(60),
    publicBaseUrl: z.url(),
    contactEmail: z.email().nullable(),
    metaTitleDefault: z.string().trim().max(200).nullable(),
    metaDescriptionDefault: z.string().max(500).nullable(),
    ogImageMediaId: z.uuid().nullable(),
    logoMediaId: z.uuid().nullable(),
    footerText: z.string().max(2000).nullable(),
  })
  .partial()
