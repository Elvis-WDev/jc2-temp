import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { VisibilityToggleButton } from '@/components/visibility-toggle-button'
import { type Tag } from '../api'

/**
 * Columnas de la tabla de etiquetas.
 *
 * El `slug` se muestra porque aqui SI es informacion util: es lo que aparece en los
 * enlaces publicos de filtrado, y el administrador necesita reconocerlo. En las
 * pantallas de contenido, en cambio, los identificadores se ocultan
 * (`data-tables.md:58`).
 */
export function tagsColumns(acciones: {
  onEdit: (tag: Tag) => void
  onHide: (tag: Tag) => void
  onShow: (tag: Tag) => void
  onDelete: (tag: Tag) => void
}): ColumnDef<Tag>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Name' />
      ),
      cell: ({ row }) => (
        <span className='font-medium'>{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'slug',
      meta: { className: 'w-56' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Identifier' />
      ),
      cell: ({ row }) => (
        <code className='text-xs text-muted-foreground'>
          {row.original.slug}
        </code>
      ),
    },
    {
      accessorKey: 'category',
      meta: { className: 'w-40' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Category' />
      ),
      cell: ({ row }) =>
        row.original.category === null ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          <Badge variant='outline'>{row.original.category}</Badge>
        ),
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      meta: { className: 'w-28' },
      cell: ({ row }) =>
        row.original.isActive ? (
          <StatusBadge tone='success'>En uso</StatusBadge>
        ) : (
          <StatusBadge tone='neutral'>Hidden</StatusBadge>
        ),
    },
    {
      id: 'actions',
      // La columna de acciones va la ultima, estrecha y estable (`data-tables.md:57`).
      meta: { className: 'w-32' },
      cell: ({ row }) => (
        <div className='flex justify-end gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label={`Edit ${row.original.name}`}
                onClick={() => {
                  acciones.onEdit(row.original)
                }}
              >
                <Pencil className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <VisibilityToggleButton
            isActive={row.original.isActive}
            name={row.original.name}
            hideLabel='Ocultar'
            showLabel='Mostrar'
            onHide={() => {
              acciones.onHide(row.original)
            }}
            onShow={() => {
              acciones.onShow(row.original)
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                aria-label={`Delete ${row.original.name}`}
                onClick={() => {
                  acciones.onDelete(row.original)
                }}
              >
                <Trash2 className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      ),
    },
  ]
}
