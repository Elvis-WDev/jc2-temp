import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import {
  Download,
  FileText,
  Image,
  Pencil,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { LOCALE } from '@/lib/locale'
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
import {
  deleteMedia,
  formatFileSize,
  listMedia,
  MEDIA_KINDS,
  NOMBRE_DE_FAMILIA,
  type MediaAsset,
} from './api'
import { EditMediaDialog } from './components/edit-dialog'
import { UploadDialog } from './components/upload-dialog'

const route = getRouteApi('/admin/media/')

const FECHA = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' })

/** Icono segun la familia del archivo, para reconocerlo de un vistazo. */
function iconoDe(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (
    mimeType.includes('sheet') ||
    mimeType.includes('csv') ||
    mimeType.includes('json')
  ) {
    return Table2
  }
  return FileText
}

/** Nombre corto del formato, en vez del MIME completo. */
function formatoDe(mimeType: string): string {
  const conocidos: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/zip': 'ZIP',
    'application/gzip': 'TAR.GZ',
    'application/json': 'JSON',
    'text/csv': 'CSV',
    'text/x-tex': 'LaTeX',
    'text/x-bibtex': 'BibTeX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
  }
  if (mimeType in conocidos) return conocidos[mimeType] as string
  if (mimeType.includes('wordprocessingml')) return 'Word'
  if (mimeType.includes('spreadsheetml')) return 'Excel'
  if (mimeType.includes('presentationml')) return 'PowerPoint'
  return mimeType.split('/')[1]?.toUpperCase() ?? 'File'
}

export function Media() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState<MediaAsset | null>(null)
  const [borrando, setBorrando] = useState<MediaAsset | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.kind === undefined ? {} : { kind: search.kind }),
    ...(search.visibility === undefined
      ? {}
      : { visibility: search.visibility }),
  }

  const hayFiltro =
    (search.q !== undefined && search.q !== '') ||
    search.kind !== undefined ||
    search.visibility !== undefined

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: () => listMedia(params),
  })

  const borrar = useToastMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      deleteMedia(id, force),
    invalidates: [queryKeys.media.all],
    success: 'File deleted.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'MEDIA_IN_USE') {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        accessorKey: 'originalFilename',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='File' />
        ),
        cell: ({ row }) => {
          const Icono = iconoDe(row.original.mimeType)
          return (
            <div className='flex min-w-0 items-center gap-2'>
              <Icono
                className='size-4 shrink-0 text-muted-foreground'
                aria-hidden
              />
              <span className='truncate font-medium'>
                {row.original.originalFilename}
              </span>
            </div>
          )
        },
      },
      {
        id: 'formato',
        meta: { className: 'w-28' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Format' />
        ),
        cell: ({ row }) => (
          <StatusBadge tone='info' dot={false}>
            {formatoDe(row.original.mimeType)}
          </StatusBadge>
        ),
      },
      {
        accessorKey: 'sizeBytes',
        meta: { className: 'w-24 text-end tabular-nums' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Size' />
        ),
        cell: ({ row }) => formatFileSize(row.original.sizeBytes),
      },
      {
        accessorKey: 'isPublic',
        meta: { className: 'w-36' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Visibility' />
        ),
        cell: ({ row }) =>
          row.original.isPublic ? (
            <StatusBadge tone='success'>Visible on the site</StatusBadge>
          ) : (
            <StatusBadge tone='neutral'>Only you</StatusBadge>
          ),
      },
      {
        accessorKey: 'createdAt',
        meta: { className: 'w-32' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Subido' />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>
            {FECHA.format(new Date(row.original.createdAt))}
          </span>
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
                  aria-label={`Edit ${row.original.originalFilename}`}
                  onClick={() => {
                    setEditando(row.original)
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
                  asChild
                  aria-label={`Download ${row.original.originalFilename}`}
                >
                  <a
                    href={`${import.meta.env.VITE_API_URL ?? ''}/api/admin/media/${row.original.id}/download`}
                    target='_blank'
                    rel='noreferrer'
                  >
                    <Download className='size-4' />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Delete ${row.original.originalFilename}`}
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
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Files</h2>
            <p className='text-muted-foreground'>
              PDFs, slides, data and images that accompany your work and
              courses.
            </p>
          </div>
          <Button
            onClick={() => {
              setSubiendo(true)
            }}
          >
            <Upload /> Upload file
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search by file name...'
          urlFilters={[
            { columnId: 'formato', searchKey: 'kind', type: 'string' },
            { columnId: 'isPublic', searchKey: 'visibility', type: 'string' },
          ]}
          facetFilters={[
            {
              columnId: 'formato',
              title: 'Type',
              options: MEDIA_KINDS.map((kind) => ({
                label: NOMBRE_DE_FAMILIA[kind],
                value: kind,
              })),
            },
            {
              columnId: 'isPublic',
              title: 'Visibility',
              options: [
                { label: 'Visible on the site', value: 'public' },
                { label: 'Only you', value: 'private' },
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
                description='No file matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        q: undefined,
                        kind: undefined,
                        visibility: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='You have not uploaded anything yet'
                description='Upload the PDF of a paper, the slides of a course or a cover image.'
                action={{
                  label: 'Upload file',
                  onClick: () => {
                    setSubiendo(true)
                  },
                }}
              />
            )
          }
        />
      </Main>

      <UploadDialog open={subiendo} onOpenChange={setSubiendo} />

      {editando !== null && (
        <EditMediaDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setEditando(null)
          }}
          asset={editando}
        />
      )}

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) {
              setBorrando(null)
              setEnUso(null)
            }
          }}
          name={borrando.originalFilename}
          title={enUso === null ? 'Delete file' : 'The file is in use'}
          description={
            enUso === null
              ? 'It will no longer be available and cannot be downloaded again.'
              : 'If you continue, it will be removed from everything using it.'
          }
          {...(enUso === null ? {} : { warning: enUso })}
          confirmText={
            enUso === null ? 'Delete' : 'Remove from everything and delete'
          }
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate({ id: borrando.id, force: enUso !== null })
          }}
        />
      )}
    </>
  )
}
