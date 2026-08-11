import { type ColumnDef } from '@tanstack/react-table'
import {
  Archive,
  GalleryHorizontal,
  Pencil,
  Send,
  Star,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import {
  EDITORIAL_STATUS_LABELS,
  type EditorialStatus,
  type Work,
} from '../api'

/** Publicado en verde, borrador en ambar, archivado apagado. */
const TONO_PUBLICACION: Record<EditorialStatus, StatusTone> = {
  published: 'success',
  draft: 'warning',
  archived: 'neutral',
}

type Acciones = {
  onEdit: (work: Work) => void
  onPublish: (work: Work) => void
  onArchive: (work: Work) => void
  onToggleFeatured: (work: Work) => void
  onToggleCarousel: (work: Work) => void
  onDelete: (work: Work) => void
}

/**
 * Columnas del listado de trabajos.
 *
 * Los identificadores internos no se muestran (`data-tables.md:58`): la identidad de
 * un trabajo son su titulo, sus autores y su venue.
 *
 * Las acciones se deshabilitan cuando el backend las rechazaria, **con la razon en el
 * tooltip**: publicar sin autores devuelve 422 por RN-002, y destacar exige estar
 * publicado por RN-003. Dejar el boton activo para que el usuario reciba un error es
 * peor que explicarle por que no puede.
 */
export function worksColumns(acciones: Acciones): ColumnDef<Work>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Work' />
      ),
      cell: ({ row }) => {
        const autores = row.original.authors
          .map((autor) => autor.fullName)
          .slice(0, 3)
          .join(', ')
        const resto = row.original.authors.length - 3

        return (
          <div className='max-w-md min-w-0'>
            <p className='truncate font-medium'>{row.original.title}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {autores === '' ? 'No authors' : autores}
              {resto > 0 && ` +${String(resto)}`}
              {row.original.venueName !== null &&
                ` · ${row.original.venueName}`}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'workTypeLabel',
      // Ancho fijo: sin el, cada pagina recalcula el reparto segun su contenido y las
      // columnas se mueven al navegar.
      meta: { className: 'w-44' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Type' />
      ),
      cell: ({ row }) => (
        <Badge variant='outline'>{row.original.workTypeLabel}</Badge>
      ),
    },
    {
      accessorKey: 'publicationYear',
      meta: { className: 'w-20 text-end tabular-nums' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Year' />
      ),
      cell: ({ row }) =>
        row.original.publicationYear ?? (
          <span className='text-muted-foreground'>—</span>
        ),
    },
    {
      accessorKey: 'academicStatus',
      meta: { className: 'w-44' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Academic status' />
      ),
      // La etiqueta y el color vienen con el trabajo: los estados los crea el titular,
      // asi que un mapa fijo aqui no podria cubrir uno nuevo.
      cell: ({ row }) => (
        <StatusBadge tone={row.original.academicStatusTone}>
          {row.original.academicStatusLabel}
        </StatusBadge>
      ),
    },
    {
      accessorKey: 'editorialStatus',
      meta: { className: 'w-44' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Publication' />
      ),
      cell: ({ row }) => {
        const estado = row.original.editorialStatus
        return (
          <StatusBadge tone={TONO_PUBLICACION[estado]}>
            {EDITORIAL_STATUS_LABELS[estado]}
            {row.original.isFeatured && ' · featured'}
            {row.original.isCarousel && ' · carousel'}
          </StatusBadge>
        )
      },
    },
    {
      id: 'actions',
      meta: { className: 'w-44' },
      cell: ({ row }) => {
        const work = row.original
        const sinAutores = work.authors.length === 0
        const publicado = work.editorialStatus === 'published'

        return (
          <div className='flex justify-end gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Edit ${work.title}`}
                  onClick={() => {
                    acciones.onEdit(work)
                  }}
                >
                  <Pencil className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={sinAutores || publicado}
                    aria-label={`Publish ${work.title}`}
                    onClick={() => {
                      acciones.onPublish(work)
                    }}
                  >
                    <Send className='size-4' />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {sinAutores
                  ? 'Add at least one author before publishing'
                  : publicado
                    ? 'Already published'
                    : 'Publicar'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={!publicado}
                    aria-label={`${work.isFeatured ? 'Remove from' : 'Add to'} featured`}
                    onClick={() => {
                      acciones.onToggleFeatured(work)
                    }}
                  >
                    <Star
                      className={
                        work.isFeatured ? 'size-4 fill-current' : 'size-4'
                      }
                    />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!publicado
                  ? 'Only published work can be featured'
                  : work.isFeatured
                    ? 'Remove from the home page'
                    : 'Feature on the home page'}
              </TooltipContent>
            </Tooltip>

            {/* El carrusel va justo al lado de destacar: son dos listas distintas y
                verlas juntas es lo que deja claro que un trabajo puede estar en las
                dos, en una o en ninguna. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={!publicado}
                    aria-label={`${work.isCarousel ? 'Remove from' : 'Add to'} carousel`}
                    onClick={() => {
                      acciones.onToggleCarousel(work)
                    }}
                  >
                    <GalleryHorizontal
                      className={
                        work.isCarousel ? 'size-4 fill-current' : 'size-4'
                      }
                    />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {!publicado
                  ? 'Only published work can go in the carousel'
                  : work.isCarousel
                    ? 'Remove from the carousel'
                    : 'Put in the home carousel'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={work.editorialStatus === 'archived'}
                    aria-label={`Archive ${work.title}`}
                    onClick={() => {
                      acciones.onArchive(work)
                    }}
                  >
                    <Archive className='size-4' />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {work.editorialStatus === 'archived'
                  ? 'Already archived'
                  : 'Archivar'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Delete ${work.title}`}
                  onClick={() => {
                    acciones.onDelete(work)
                  }}
                >
                  <Trash2 className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
  ]
}
