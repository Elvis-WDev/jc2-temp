import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SiteResearch } from '@/features/site/research'

/**
 * Listado publico de trabajos.
 *
 * El esquema de busqueda es el contrato de la direccion: lo que no este aqui no
 * sobrevive a una recarga. Desde que el listado va agrupado por tipo y sin filtros, lo
 * unico que hay que conservar es la pagina; el orden lo fija el codigo.
 */
const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})

export const Route = createFileRoute('/_public/research/')({
  component: SiteResearch,
  validateSearch: searchSchema,
})
