import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { AppDataTable, DataTableColumnHeader } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { VisibilityToggleButton } from '@/components/visibility-toggle-button'
import { ConfigurationLayout } from '@/features/configuration/layout'
import {
  deleteCitationStyle,
  listCitationStyles,
  updateCitationStyle,
  type CitationStyle,
} from './api'
import { StyleFormDialog } from './components/style-form-dialog'

const route = getRouteApi('/admin/citation-styles/')

/**
 * Estilos en los que se puede escribir la cita de un trabajo.
 *
 * El BibTeX que genera el sistema sigue como estaba; esto es para ofrecer además la
 * forma de citar que publica la editorial.
 */
export function CitationStyles() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<CitationStyle | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<CitationStyle | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.citationStyles.list(false),
    queryFn: () => listCitationStyles(),
  })

  const refresca = [queryKeys.citationStyles.all]

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => updateCitationStyle(id, { isActive: true }),
    invalidates: refresca,
    success: 'Style visible. It can be chosen for work again.',
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => updateCitationStyle(id, { isActive: false }),
    invalidates: refresca,
    success: 'Style hidden. Citations already written in it do not change.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteCitationStyle(id),
    invalidates: refresca,
    success: 'Estilo eliminado.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'CITATION_STYLE_IN_USE') {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<CitationStyle>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Style' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'extension',
        meta: { className: 'w-48' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='On download' />
        ),
        cell: ({ row }) =>
          row.original.extension === null ? (
            <span className='text-sm text-muted-foreground'>Texto plano</span>
          ) : (
            <code className='text-xs text-muted-foreground'>
              .{row.original.extension}
            </code>
          ),
      },
      {
        accessorKey: 'isActive',
        meta: { className: 'w-36' },
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Available' />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone='success'>Offered</StatusBadge>
          ) : (
            <StatusBadge tone='neutral'>Hidden</StatusBadge>
          ),
      },
      {
        id: 'actions',
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
                    setEditando(row.original)
                    setFormAbierto(true)
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
              onHide={() => {
                ocultar.mutate(row.original.id)
              }}
              onShow={() => {
                mostrar(row.original.id)
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Delete ${row.original.name}`}
                  onClick={() => {
                    setEnUso(null)
                    setBorrando(row.original)
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
    ],
    [mostrar, ocultar]
  )

  const abrirAlta = () => {
    setEditando(undefined)
    setFormAbierto(true)
  }

  return (
    <>
      <ConfigurationLayout>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Citation styles
            </h2>
            <p className='text-muted-foreground'>
              The formats in which you can write the citation of a work.
            </p>
          </div>
          <Button onClick={abrirAlta}>
            <Plus /> New style
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search styles...'
          facetFilters={[
            {
              columnId: 'isActive',
              title: 'Available',
              options: [
                { label: 'Offered', value: 'true' },
                { label: 'Ocultos', value: 'false' },
              ],
            },
          ]}
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='No styles'
                description='Create the first one so you can write citations in it.'
                action={{ label: 'New style', onClick: abrirAlta }}
              />
            )
          }
        />
      </ConfigurationLayout>

      <StyleFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { style: editando })}
      />

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) {
              setBorrando(null)
              setEnUso(null)
            }
          }}
          name={borrando.name}
          title='Delete style'
          description='It will no longer exist in the list.'
          warning={
            enUso ??
            'If there are citations written in this style it cannot be deleted. In that case hide it: it stops being offered and the citations are kept.'
          }
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
