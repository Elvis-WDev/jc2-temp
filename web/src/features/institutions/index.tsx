import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
  activateInstitution,
  deactivateInstitution,
  deleteInstitution,
  listInstitutions,
  type Institution,
} from './api'
import { InstitutionFormDialog } from './components/institution-form-dialog'

const route = getRouteApi('/admin/institutions/')

export function Institutions() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Institution | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Institution | null>(null)
  const [ocultando, setOcultando] = useState<Institution | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.active === undefined ? {} : { active: search.active }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.institutions.list(params),
    queryFn: () => listInstitutions(params),
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => deactivateInstitution(id),
    invalidates: [queryKeys.institutions.all],
    success:
      'Institution hidden. It can no longer be chosen in courses and affiliations.',
    onSuccess: () => {
      setOcultando(null)
    },
    onError: () => {
      setOcultando(null)
    },
  })

  // Mostrar no pregunta: no retira nada de ningun sitio y se deshace ocultando otra vez.
  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => activateInstitution(id),
    invalidates: [queryKeys.institutions.all],
    success:
      'Institution visible. It can be chosen in courses and affiliations again.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteInstitution(id),
    invalidates: [queryKeys.institutions.all],
    success: 'Institution deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<Institution>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Institution' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.name}</p>
            {row.original.shortName !== null && (
              <p className='text-xs text-muted-foreground'>
                {row.original.shortName}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'ubicacion',
        meta: { className: 'w-52' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Location' />
        ),
        cell: ({ row }) => {
          const partes = [row.original.city, row.original.countryCode].filter(
            (parte): parte is string => parte !== null && parte !== ''
          )
          return partes.length > 0 ? (
            partes.join(', ')
          ) : (
            <span className='text-muted-foreground'>—</span>
          )
        },
      },
      {
        accessorKey: 'isActive',
        meta: { className: 'w-28' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone='success'>Active</StatusBadge>
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
              hideLabel='Hide'
              showLabel='Show'
              onHide={() => {
                setOcultando(row.original)
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
    [mostrar]
  )

  const hayFiltro =
    (search.q !== undefined && search.q !== '') || search.active !== undefined

  return (
    <>
      <ConfigurationLayout>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Institutions</h2>
            <p className='text-muted-foreground'>
              Universities and centres you work with.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditando(undefined)
              setFormAbierto(true)
            }}
          >
            <Plus /> New institution
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search by name or acronym...'
          urlFilters={[
            { columnId: 'isActive', searchKey: 'active', type: 'string' },
          ]}
          facetFilters={[
            {
              columnId: 'isActive',
              title: 'Status',
              options: [
                { label: 'Visibles', value: 'true' },
                { label: 'Ocultas', value: 'false' },
              ],
            },
          ]}
          server={{
            rowCount: data?.meta.pagination.totalItems ?? 0,
            isLoading,
          }}
          emptyState={
            hayFiltro ? (
              <EmptyState
                variant='no-results'
                title='No matches'
                description='No institution matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        q: undefined,
                        active: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='No institutions yet'
                description='They are needed to record affiliations and course offerings.'
                action={{
                  label: 'New institution',
                  onClick: () => {
                    setEditando(undefined)
                    setFormAbierto(true)
                  },
                }}
              />
            )
          }
        />
      </ConfigurationLayout>

      <InstitutionFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { institution: editando })}
      />

      {ocultando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setOcultando(null)
          }}
          requireTypedName={false}
          name={ocultando.name}
          title={`Hide ${ocultando.name}`}
          description='It can no longer be chosen when creating courses and affiliations. What already uses it does not change.'
          warning='You can show it again whenever you want from this same table.'
          confirmText='Hide'
          isLoading={ocultar.isPending}
          onConfirm={() => {
            ocultar.mutate(ocultando.id)
          }}
        />
      )}

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          name={borrando.name}
          title='Delete institution'
          description='It will be removed from the list of available institutions.'
          warning='If it has departments, courses or affiliations, it cannot be deleted. In that case hide it.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
