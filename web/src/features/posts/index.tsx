import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Archive, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { husoDelSitioActual } from '@/lib/huso'
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
import { StatusBadge, type StatusTone } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  archivePost,
  deletePost,
  listPosts,
  publishPost,
  type EditorialStatus,
  type PostItem,
} from './api'
import { kindDeSegmento, type PostKind } from './kinds'

/**
 * Una sola pantalla para las dos formas.
 *
 * El tipo viene de la direccion, no de un filtro que el titular pueda cambiar: desde
 * «News» solo se ven y se crean noticias. Lo unico que cambia entre las dos es el
 * encabezado y si la columna de adjuntos tiene sentido.
 */

const route = getRouteApi('/admin/posts/$kind/')

const ESTADO: Record<EditorialStatus, { texto: string; tono: StatusTone }> = {
  draft: { texto: 'Draft', tono: 'warning' },
  published: { texto: 'Published', tono: 'success' },
  archived: { texto: 'Archived', tono: 'neutral' },
}

/** Con el reloj del sitio, igual que la fecha que se ensena en la web. */
const fecha = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'medium',
    timeZone: husoDelSitioActual(),
  }).format(new Date(iso))

export function Posts() {
  const { kind: segmento } = route.useParams()
  const tipo = kindDeSegmento(segmento)

  if (tipo === null) {
    return (
      <Main>
        <EmptyState
          variant='no-results'
          title='Unknown section'
          description='Only News and Blog have a screen of their own.'
        />
      </Main>
    )
  }

  // Con `key`: al pasar de News a Blog cambia el tipo pero no el componente, y sin esto
  // los dialogos abiertos y la busqueda escrita se arrastrarian de una a otra.
  return <Listado key={tipo.segment} tipo={tipo} />
}

function Listado({ tipo }: { tipo: PostKind }) {
  const search = route.useSearch()
  const tableNavigate = route.useNavigate()
  const navigate = useNavigate()

  const [borrando, setBorrando] = useState<PostItem | null>(null)
  const [archivando, setArchivando] = useState<PostItem | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    kind: tipo.code,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.status === undefined
      ? {}
      : { status: search.status as EditorialStatus }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.posts.list(params),
    queryFn: () => listPosts(params),
  })

  const refresca = [queryKeys.posts.all]

  const { mutate: publicar } = useToastMutation({
    mutationFn: (id: string) => publishPost(id),
    invalidates: refresca,
    success: 'Published. It now appears on the site.',
  })

  const archivar = useToastMutation({
    mutationFn: (id: string) => archivePost(id),
    invalidates: refresca,
    success: 'Archived. It has been withdrawn from the site.',
    onSuccess: () => {
      setArchivando(null)
    },
    onError: () => {
      setArchivando(null)
    },
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deletePost(id),
    invalidates: refresca,
    success: 'Deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const crear = () => {
    void navigate({
      to: '/admin/posts/$kind/new',
      params: { kind: tipo.segment },
    })
  }

  const columns = useMemo<ColumnDef<PostItem>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Title' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.title}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {row.original.summary ?? `/${row.original.slug}`}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'publishedAt',
        meta: { className: 'w-40' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Published' />
        ),
        cell: ({ row }) =>
          row.original.publishedAt === null ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <span className='text-sm'>{fecha(row.original.publishedAt)}</span>
          ),
      },
      ...(tipo.conCuerpo
        ? [
            {
              id: 'files',
              meta: { className: 'w-28' },
              header: ({ column }) => (
                <DataTableColumnHeader column={column} title='Attachments' />
              ),
              cell: ({ row }) =>
                row.original.files.length === 0 ? (
                  <span className='text-muted-foreground'>—</span>
                ) : (
                  <span className='text-sm'>{row.original.files.length}</span>
                ),
            } satisfies ColumnDef<PostItem>,
          ]
        : []),
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
              {row.original.displayOrder !== null && (
                <StatusBadge tone='info'>Pinned</StatusBadge>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        meta: { className: 'w-40' },
        cell: ({ row }) => {
          const entrada = row.original
          const publicado = entrada.editorialStatus === 'published'

          return (
            <div className='flex justify-end gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Edit ${entrada.title}`}
                    onClick={() => {
                      void navigate({
                        to: '/admin/posts/$kind/$postId',
                        params: { kind: tipo.segment, postId: entrada.id },
                      })
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
                    aria-label={`Publish ${entrada.title}`}
                    onClick={() => {
                      publicar(entrada.id)
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
                    disabled={entrada.editorialStatus === 'archived'}
                    aria-label={`Archive ${entrada.title}`}
                    onClick={() => {
                      setArchivando(entrada)
                    }}
                  >
                    <Archive className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {entrada.editorialStatus === 'archived'
                    ? 'Already archived'
                    : 'Withdraw from the site'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Delete ${entrada.title}`}
                    onClick={() => {
                      setBorrando(entrada)
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
    ],
    [navigate, publicar, tipo]
  )

  const hayFiltro =
    (search.q !== undefined && search.q !== '') || search.status !== undefined

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
            <h2 className='text-2xl font-bold tracking-tight'>{tipo.plural}</h2>
            <p className='text-muted-foreground'>{tipo.descripcion}</p>
          </div>
          <Button onClick={crear}>
            <Plus /> New {tipo.singular}
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={tableNavigate}
          searchPlaceholder='Search by title or summary...'
          urlFilters={[
            {
              columnId: 'editorialStatus',
              searchKey: 'status',
              type: 'string',
            },
          ]}
          facetFilters={[
            {
              columnId: 'editorialStatus',
              title: 'Status',
              options: [
                { label: 'Published', value: 'published' },
                { label: 'Draft', value: 'draft' },
                { label: 'Archived', value: 'archived' },
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
                description='Nothing matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void tableNavigate({
                      search: (prev) => ({
                        ...prev,
                        q: undefined,
                        status: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title={`Nothing here yet`}
                description='Create the first one. It will appear on your site as soon as you publish it.'
                action={{ label: `New ${tipo.singular}`, onClick: crear }}
              />
            )
          }
        />
      </Main>

      {archivando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setArchivando(null)
          }}
          requireTypedName={false}
          name={archivando.title}
          title='Archive entry'
          description='It will be withdrawn from the site. You still keep it whole here.'
          warning='You can publish it again whenever you want.'
          confirmText='Archive'
          isLoading={archivar.isPending}
          onConfirm={() => {
            archivar.mutate(archivando.id)
          }}
        />
      )}

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          name={borrando.title}
          title='Delete entry'
          description='It will be deleted forever.'
          warning='If you only want it to stop appearing on the site, archive it: it is kept and you can restore it.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
