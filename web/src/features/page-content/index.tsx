import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfigDrawer } from '@/components/config-drawer'
import { AppDataTable, DataTableColumnHeader } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  listPageContent,
  NOMBRE_DE_PAGINA,
  QUE_MUESTRA,
  type PageContent,
} from './api'
import { PageFormDialog } from './components/page-form-dialog'

const route = getRouteApi('/admin/page-content/')

/**
 * Las tres páginas de la web. No se crean ni se borran: son fijas, así que aquí solo se
 * editan sus textos de cabecera y se decide si están visibles.
 */
export function PageContentList() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<PageContent | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.pageContent.all,
    queryFn: listPageContent,
  })

  const columns = useMemo<ColumnDef<PageContent>[]>(
    () => [
      {
        accessorKey: 'pageKey',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Page' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='font-medium'>
              {NOMBRE_DE_PAGINA[row.original.pageKey]}
            </p>
            <p className='text-xs text-muted-foreground'>
              {QUE_MUESTRA[row.original.pageKey]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'pageTitle',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Title' />
        ),
        cell: ({ row }) =>
          row.original.pageTitle === null ? (
            // Una pagina publicada sin titulo sale en blanco en la web; se avisa aqui.
            <StatusBadge tone='warning'>Untitled</StatusBadge>
          ) : (
            <span className='truncate'>{row.original.pageTitle}</span>
          ),
      },
      {
        accessorKey: 'isPublished',
        meta: { className: 'w-40' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) =>
          row.original.isPublished ? (
            <StatusBadge tone='success'>Visible</StatusBadge>
          ) : (
            <StatusBadge tone='neutral'>Hidden</StatusBadge>
          ),
      },
      {
        id: 'actions',
        meta: { className: 'w-16' },
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Edit la pagina ${NOMBRE_DE_PAGINA[row.original.pageKey]}`}
                  onClick={() => {
                    setEditando(row.original)
                  }}
                >
                  <Pencil className='size-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </div>
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
          <h2 className='text-2xl font-bold tracking-tight'>Page content</h2>
          <p className='text-muted-foreground'>
            The header texts of the pages of your site.
          </p>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search pages...'
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='The pages could not be loaded'
                description='Please try again in a moment.'
              />
            )
          }
        />
      </Main>

      {editando !== null && (
        <PageFormDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setEditando(null)
          }}
          page={editando}
        />
      )}
    </>
  )
}
