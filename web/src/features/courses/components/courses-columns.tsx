import { type ColumnDef } from '@tanstack/react-table'
import { Archive, Pencil, Send, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { type Course, type EditorialStatus } from '../api'

/**
 * Columnas de la tabla de cursos.
 *
 * Las acciones se deshabilitan cuando la API las rechazaría, **con la razón en el
 * tooltip**: destacar exige estar publicado. Dejar el botón activo para que el usuario
 * reciba un error es hacerle descubrir la regla a base de fallos.
 */

const ESTADO: Record<EditorialStatus, { texto: string; tono: StatusTone }> = {
  draft: { texto: 'Draft', tono: 'warning' },
  published: { texto: 'Published', tono: 'success' },
  archived: { texto: 'Archived', tono: 'neutral' },
}

export function coursesColumns(acciones: {
  onEdit: (curso: Course) => void
  onPublish: (curso: Course) => void
  onArchive: (curso: Course) => void
  onToggleFeatured: (curso: Course) => void
  onDelete: (curso: Course) => void
}): ColumnDef<Course>[] {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Course' />
      ),
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='truncate font-medium'>{row.original.title}</p>
          <p className='truncate text-xs text-muted-foreground'>
            {[row.original.defaultCode, row.original.level]
              .filter(
                (parte): parte is string => parte !== null && parte !== ''
              )
              .join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'ediciones',
      meta: { className: 'w-40' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Offerings' />
      ),
      cell: ({ row }) => {
        const total = row.original.offerings.length
        if (total === 0) {
          // Un curso sin ediciones no dice donde ni cuando se imparte, asi que en la web
          // sale vacio. Se avisa aqui en lugar de dejar un cero neutro.
          return <StatusBadge tone='warning'>No offerings</StatusBadge>
        }
        const anios = row.original.offerings
          .map((edicion) => edicion.academicYear)
          .filter((anio): anio is number => anio !== null)
        const rango =
          anios.length === 0
            ? null
            : anios.length === 1 || Math.min(...anios) === Math.max(...anios)
              ? String(Math.min(...anios))
              : `${String(Math.min(...anios))}–${String(Math.max(...anios))}`

        return (
          <span className='text-sm'>
            {total} {total === 1 ? 'edicion' : 'ediciones'}
            {rango !== null && (
              <span className='text-muted-foreground'> · {rango}</span>
            )}
          </span>
        )
      },
    },
    {
      accessorKey: 'editorialStatus',
      meta: { className: 'w-40' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const estado = ESTADO[row.original.editorialStatus]
        return (
          <div className='flex flex-wrap gap-1'>
            <StatusBadge tone={estado.tono}>{estado.texto}</StatusBadge>
            {row.original.isFeatured && (
              <StatusBadge tone='info'>En portada</StatusBadge>
            )}
          </div>
        )
      },
    },
    {
      id: 'actions',
      meta: { className: 'w-44' },
      cell: ({ row }) => {
        const curso = row.original
        const publicado = curso.editorialStatus === 'published'

        return (
          <div className='flex justify-end gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Edit ${curso.title}`}
                  onClick={() => {
                    acciones.onEdit(curso)
                  }}
                >
                  <Pencil className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={publicado}
                  aria-label={`Publish ${curso.title}`}
                  onClick={() => {
                    acciones.onPublish(curso)
                  }}
                >
                  <Send className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {publicado ? 'Already published' : 'Publish to the site'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={!publicado}
                  aria-label={`${curso.isFeatured ? 'Remove from the home page' : 'Feature on the home page'}: ${curso.title}`}
                  onClick={() => {
                    acciones.onToggleFeatured(curso)
                  }}
                >
                  <Star
                    className={
                      curso.isFeatured ? 'size-4 fill-current' : 'size-4'
                    }
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!publicado
                  ? 'Publicalo antes de destacarlo'
                  : curso.isFeatured
                    ? 'Remove from the home page'
                    : 'Feature on the home page'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={curso.editorialStatus === 'archived'}
                  aria-label={`Archive ${curso.title}`}
                  onClick={() => {
                    acciones.onArchive(curso)
                  }}
                >
                  <Archive className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {curso.editorialStatus === 'archived'
                  ? 'Already archived'
                  : 'Withdraw from the site'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Delete ${curso.title}`}
                  onClick={() => {
                    acciones.onDelete(curso)
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
