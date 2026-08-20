import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { BLOG, type PaginaConListado } from '@/features/site/post-pages'
import { SitePosts } from '@/features/site/posts'

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
})

export const Route = createFileRoute('/_public/blog/')({
  validateSearch: searchSchema,
  // El componente va inline: exportar ademas una funcion desde el archivo de ruta
  // rompe el fast refresh de Vite.
  component: () => <SitePosts pagina={BLOG as PaginaConListado} />,
})
