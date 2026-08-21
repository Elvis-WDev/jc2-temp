import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { queryKeys } from '@/lib/api/query-keys'
import { LOCALE } from '@/lib/locale'
import { Badge } from '@/components/ui/badge'
import { ConfigDrawer } from '@/components/config-drawer'
import {
  AppDataTable,
  DataTableColumnHeader,
  DateRangeFilter,
} from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  ACTION_LABELS,
  ENTITY_LABELS,
  listAuditLog,
  type AuditEntry,
} from './api'

const route = getRouteApi('/admin/audit-log/')

const FORMATO_FECHA = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function AuditLog() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // El calendario elige dias; la API espera instantes. El "hasta" abarca el dia
  // completo: elegir el 5 y no ver lo que paso el 5 por la tarde seria desconcertante.
  const desde =
    search.from === undefined
      ? undefined
      : new Date(`${search.from}T00:00:00`).toISOString()
  const hasta =
    search.to === undefined
      ? undefined
      : new Date(`${search.to}T23:59:59.999`).toISOString()

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.entityType === undefined || search.entityType === ''
      ? {}
      : { entityType: search.entityType }),
    ...(search.action === undefined || search.action === ''
      ? {}
      : { action: search.action }),
    ...(desde === undefined ? {} : { from: desde }),
    ...(hasta === undefined ? {} : { to: hasta }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auditLog(params),
    queryFn: () => listAuditLog(params),
  })

  const hayFiltro =
    search.entityType !== undefined ||
    search.action !== undefined ||
    search.from !== undefined ||
    search.to !== undefined

  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='When' />
        ),
        cell: ({ row }) => (
          <span className='text-sm tabular-nums'>
            {FORMATO_FECHA.format(new Date(row.original.createdAt))}
          </span>
        ),
      },
      {
        accessorKey: 'userName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Who' />
        ),
        cell: ({ row }) =>
          row.original.userName ?? (
            // La entrada sobrevive al borrado del usuario: es lo que debe pasar en una
            // auditoria, y se dice en lugar de dejar la celda vacia.
            <span className='text-sm text-muted-foreground'>
              Usuario eliminado
            </span>
          ),
      },
      {
        accessorKey: 'action',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Action' />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.action === 'delete' ? 'destructive' : 'outline'
            }
          >
            {ACTION_LABELS[row.original.action] ?? row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: 'entityType',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='On what' />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>
            {ENTITY_LABELS[row.original.entityType] ?? row.original.entityType}
          </span>
        ),
      },
    ],
    []
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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Audit log</h2>
          <p className='text-muted-foreground'>
            Everything created, edited or deleted, and when.
          </p>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          urlFilters={[
            { columnId: 'entityType', searchKey: 'entityType', type: 'string' },
            { columnId: 'action', searchKey: 'action', type: 'string' },
          ]}
          facetFilters={[
            {
              columnId: 'entityType',
              title: 'On what',
              options: Object.entries(ENTITY_LABELS).map(([value, label]) => ({
                label,
                value,
              })),
            },
            {
              columnId: 'action',
              title: 'Action',
              options: Object.entries(ACTION_LABELS).map(([value, label]) => ({
                label,
                value,
              })),
            },
          ]}
          extraFilters={
            <DateRangeFilter
              title='Dates'
              from={search.from}
              to={search.to}
              onChange={(rango) => {
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    from: rango.from,
                    to: rango.to,
                    page: 1,
                  }),
                })
              }}
            />
          }
          server={{
            rowCount: data?.meta.pagination.totalItems ?? 0,
            isLoading,
          }}
          emptyState={
            hayFiltro ? (
              <EmptyState
                variant='no-results'
                title='No matches'
                description='No activity matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        entityType: undefined,
                        action: undefined,
                        from: undefined,
                        to: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='No activity recorded yet'
                description='Administrative operations will appear here as they happen.'
              />
            )
          }
        />
      </Main>
    </>
  )
}
