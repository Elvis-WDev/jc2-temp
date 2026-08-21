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
  deleteAcademicStatus,
  listAcademicStatuses,
  updateAcademicStatus,
  type AcademicStatus,
} from './api'
import { StatusFormDialog } from './components/status-form-dialog'

const route = getRouteApi('/admin/academic-statuses/')

/**
 * Estados académicos: cómo de avanzado está un trabajo.
 *
 * Antes eran ocho valores fijos en la base de datos. No deciden si un trabajo se ve en
 * la web —de eso se encarga publicar o archivar—, así que puedes crear los que uses.
 */
export function AcademicStatuses() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<AcademicStatus | undefined>(
    undefined
  )
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<AcademicStatus | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.academicStatuses.list(false),
    queryFn: () => listAcademicStatuses(),
  })

  const refresca = [queryKeys.academicStatuses.all, queryKeys.works.all]

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => updateAcademicStatus(id, { isActive: true }),
    invalidates: refresca,
    success: 'Status visible. It can be chosen for work again.',
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => updateAcademicStatus(id, { isActive: false }),
    invalidates: refresca,
    success: 'Status hidden. Work that already has it does not change.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteAcademicStatus(id),
    invalidates: refresca,
    success: 'Status deleted.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.code === 'ACADEMIC_STATUS_IN_USE'
      ) {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<AcademicStatus>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => (
          <StatusBadge tone={row.original.tone}>
            {row.original.label}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'code',
        meta: { className: 'w-56' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Code' />
        ),
        cell: ({ row }) => (
          <code className='text-xs text-muted-foreground'>
            {row.original.code}
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
                  aria-label={`Edit ${row.original.label}`}
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
              name={row.original.label}
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
                  aria-label={`Delete ${row.original.label}`}
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
              Academic statuses
            </h2>
            <p className='text-muted-foreground'>
              How far along a work is. It does not decide whether it appears on
              your site.
            </p>
          </div>
          <Button onClick={abrirAlta}>
            <Plus /> New status
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search statuses...'
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
                title='No statuses'
                description='Create the first one so you can classify your work.'
                action={{ label: 'New status', onClick: abrirAlta }}
              />
            )
          }
        />
      </ConfigurationLayout>

      <StatusFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { status: editando })}
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
          name={borrando.label}
          title='Delete status'
          description='It will no longer exist in the list.'
          warning={
            enUso ??
            'If any work has it, it cannot be deleted. In that case hide it: it stops being offered and the work that has it does not change.'
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
