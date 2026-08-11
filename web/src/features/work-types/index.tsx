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
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { AppDataTable, DataTableColumnHeader } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import { VisibilityToggleButton } from '@/components/visibility-toggle-button'
import {
  activateWorkType,
  deactivateWorkType,
  deleteWorkType,
  listWorkTypes,
  type WorkType,
} from './api'
import { WorkTypeFormDialog } from './components/work-type-form-dialog'

const route = getRouteApi('/admin/work-types/')

export function WorkTypes() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<WorkType | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<WorkType | null>(null)
  const [ocultando, setOcultando] = useState<WorkType | null>(null)

  // El catalogo es corto y cerrado: se trae entero y se pagina en memoria.
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.workTypes.list(),
    queryFn: () => listWorkTypes(false),
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => deactivateWorkType(id),
    invalidates: [queryKeys.workTypes.all],
    success: 'Type hidden. It can no longer be chosen when creating work.',
    onSuccess: () => {
      setOcultando(null)
    },
    onError: () => {
      setOcultando(null)
    },
  })

  // Se desestructura `mutate`: el objeto de la mutacion cambia de identidad en cada
  // render y no sirve como dependencia de useMemo.
  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => activateWorkType(id),
    invalidates: [queryKeys.workTypes.all],
    success: 'Type visible. It can be chosen when creating work again.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteWorkType(id),
    invalidates: [queryKeys.workTypes.all],
    success: 'Tipo eliminado.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<WorkType>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Label' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.label}</span>
        ),
      },
      {
        accessorKey: 'pluralLabel',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Plural' />
        ),
      },
      {
        accessorKey: 'code',
        meta: { className: 'w-48' },
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
        meta: { className: 'w-32' },
        // El filtro trabaja con texto ('true'/'false') y la fila guarda un booleano.
        // Se compara a proposito, en vez de dejarlo al comparador por defecto, que
        // acertaria de casualidad con estos dos valores y fallaria con cualquier otro.
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone='success'>Available</StatusBadge>
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
              hideLabel='Ocultar'
              showLabel='Mostrar'
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
                  aria-label={`Delete ${row.original.label}`}
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

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Work types</h2>
            <p className='text-muted-foreground'>
              How your publications are classified. You can add as many as you
              need.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditando(undefined)
              setFormAbierto(true)
            }}
          >
            <Plus /> New type
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search types...'
          // El catalogo viene entero, asi que este filtro se resuelve en memoria y no
          // necesita nada de la API.
          facetFilters={[
            {
              columnId: 'isActive',
              title: 'Status',
              options: [
                { label: 'Visibles', value: 'true' },
                { label: 'Ocultos', value: 'false' },
              ],
            },
          ]}
          defaultPageSize={20}
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='No work types'
                description='Here you define how your publications are classified: article, book, chapter, working paper...'
              />
            )
          }
        />
      </Main>

      <WorkTypeFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { workType: editando })}
      />

      {ocultando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setOcultando(null)
          }}
          requireTypedName={false}
          name={ocultando.label}
          title={`Ocultar ${ocultando.label}`}
          description='It can no longer be chosen when creating or editing work. Those that already use it do not change.'
          warning='You can show it again whenever you want from this same table.'
          confirmText='Ocultar'
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
          name={borrando.label}
          title='Delete work type'
          description='It will no longer be available when creating or editing work.'
          warning='If there is already work of this type, it cannot be deleted. In that case hide it.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
