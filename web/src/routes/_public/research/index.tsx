import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SiteResearch } from '@/features/site/research'

/**
 * Listado publico de trabajos.
 *
 * El esquema de busqueda es el contrato de la direccion: lo que no este aqui no
 * sobrevive a una recarga. Los nombres son los mismos que acepta la API publica, para
 * que la direccion del navegador y la de la peticion se lean igual.
 */
const searchSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  year_from: z.coerce.number().int().min(1800).max(2200).optional(),
  year_to: z.coerce.number().int().min(1800).max(2200).optional(),
  sort: z.enum(['newest', 'oldest', 'title', 'relevance']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
})

export const Route = createFileRoute('/_public/research/')({
  component: SiteResearch,
  validateSearch: searchSchema,
})
