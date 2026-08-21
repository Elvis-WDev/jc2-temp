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
import { deletePerson, listPersons, type Person } from './api'
import { PersonFormDialog } from './components/person-form-dialog'

const route = getRouteApi('/admin/persons/')

export function Persons() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Person | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Person | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.persons.list(params),
    queryFn: () => listPersons(params),
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deletePerson(id),
    invalidates: [queryKeys.persons.all],
    success: 'Author deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<Person>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) => (
          <div className='flex min-w-0 items-center gap-2'>
            <span className='truncate font-medium'>
              {row.original.fullName}
            </span>
            {row.original.isSiteOwner && (
              <StatusBadge tone='info'>Your profile</StatusBadge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'orcid',
        meta: { className: 'w-52' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='ORCID' />
        ),
        cell: ({ row }) =>
          row.original.orcid === null ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <code className='text-xs text-muted-foreground'>
              {row.original.orcid}
            </code>
          ),
      },
      {
        id: 'actions',
        meta: { className: 'w-24' },
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Edit ${row.original.fullName}`}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={row.original.isSiteOwner}
                    aria-label={`Delete ${row.original.fullName}`}
                    onClick={() => {
                      setBorrando(row.original)
                    }}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {row.original.isSiteOwner
                  ? 'Your own profile cannot be deleted'
                  : 'Delete'}
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    []
  )

  const hayBusqueda = search.q !== undefined && search.q !== ''

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
            <h2 className='text-2xl font-bold tracking-tight'>Authors</h2>
            <p className='text-muted-foreground'>
              People who sign your work, including your co-authors.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditando(undefined)
              setFormAbierto(true)
            }}
          >
            <Plus /> New author
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search by name...'
          server={{
            rowCount: data?.meta.pagination.totalItems ?? 0,
            isLoading,
          }}
          emptyState={
            hayBusqueda ? (
              <EmptyState
                variant='no-results'
                title='No matches'
                description='No author matches the search.'
                action={{
                  label: 'Clear search',
                  onClick: () => {
                    void navigate({
                      search: (prev) => ({ ...prev, q: undefined, page: 1 }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='No authors yet'
                description='Add your co-authors so you can assign them to a work.'
                action={{
                  label: 'New author',
                  onClick: () => {
                    setEditando(undefined)
                    setFormAbierto(true)
                  },
                }}
              />
            )
          }
        />
      </Main>

      <PersonFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { person: editando })}
      />

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          name={borrando.fullName}
          title='Delete author'
          description='They can no longer be assigned to new work.'
          warning='If they already sign some work, they cannot be deleted. Remove them from that work first.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
