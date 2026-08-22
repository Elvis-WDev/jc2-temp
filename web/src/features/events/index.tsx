import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Archive, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { husoDelSitioActual } from '@/lib/huso'
import { LOCALE } from '@/lib/locale'
import { useCatalogTerms } from '@/hooks/use-catalog-terms'
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
  archiveEvent,
  deleteEvent,
  listEvents,
  publishEvent,
  type EditorialStatus,
  type EventItem,
} from './api'

const route = getRouteApi('/admin/events/')

const ESTADO: Record<EditorialStatus, { texto: string; tono: StatusTone }> = {
  draft: { texto: 'Draft', tono: 'warning' },
  published: { texto: 'Published', tono: 'success' },
  archived: { texto: 'Archived', tono: 'neutral' },
}

/**
 * Con el reloj del sitio, igual que la agenda publica.
 *
 * Se construye por llamada y no una vez al importar: el huso se fija al cargar los
 * ajustes, despues de que este fichero se lea.
 */
const fecha = (iso: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: husoDelSitioActual(),
  }).format(new Date(iso))

export function Events() {
  const search = route.useSearch()
  const tableNavigate = route.useNavigate()
  const navigate = useNavigate()

  const [borrando, setBorrando] = useState<EventItem | null>(null)
  const [archivando, setArchivando] = useState<EventItem | null>(null)

  const { terminos, etiqueta: etiquetaTipo } = useCatalogTerms('event')

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.eventType === undefined ? {} : { eventType: search.eventType }),
    ...(search.status === undefined
      ? {}
      : { status: search.status as EditorialStatus }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.events.list(params),
    queryFn: () => listEvents(params),
  })

  const refresca = [queryKeys.events.all]

  const { mutate: publicar } = useToastMutation({
    mutationFn: (id: string) => publishEvent(id),
    invalidates: refresca,
    success: 'Event published. It now appears on the site.',
  })

  const archivar = useToastMutation({
    mutationFn: (id: string) => archiveEvent(id),
    invalidates: refresca,
    success: 'Event archived. It has been withdrawn from the site.',
    onSuccess: () => {
      setArchivando(null)
    },
    onError: () => {
      setArchivando(null)
    },
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteEvent(id),
    invalidates: refresca,
    success: 'Event deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<EventItem>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Event' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.title}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {[
                row.original.location,
                row.original.organizer,
                ...row.original.institutions.map(
                  (institucion) => institucion.name
                ),
              ]
                .filter(
                  (parte): parte is string => parte !== null && parte !== ''
                )
                .join(' · ') || '—'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'startsAt',
        meta: { className: 'w-48' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='When' />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>{fecha(row.original.startsAt)}</span>
        ),
      },
      {
        accessorKey: 'eventType',
        meta: { className: 'w-36' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Type' />
        ),
        cell: ({ row }) =>
          row.original.eventType === null ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <StatusBadge tone='neutral' dot={false}>
              {etiquetaTipo(row.original.eventType)}
            </StatusBadge>
          ),
      },
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
              {row.original.isMain && (
                <StatusBadge tone='info'>Featured</StatusBadge>
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        meta: { className: 'w-40' },
        cell: ({ row }) => {
          const evento = row.original
          const publicado = evento.editorialStatus === 'published'

          return (
            <div className='flex justify-end gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Edit ${evento.title}`}
                    onClick={() => {
                      void navigate({
                        to: '/admin/events/$eventId',
                        params: { eventId: evento.id },
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
                    aria-label={`Publish ${evento.title}`}
                    onClick={() => {
                      publicar(evento.id)
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
                    disabled={evento.editorialStatus === 'archived'}
                    aria-label={`Archive ${evento.title}`}
                    onClick={() => {
                      setArchivando(evento)
                    }}
                  >
                    <Archive className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {evento.editorialStatus === 'archived'
                    ? 'Already archived'
                    : 'Withdraw from the site'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`Delete ${evento.title}`}
                    onClick={() => {
                      setBorrando(evento)
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
    [navigate, publicar, etiquetaTipo]
  )

  const hayFiltro =
    (search.q !== undefined && search.q !== '') ||
    search.eventType !== undefined ||
    search.status !== undefined

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
            <h2 className='text-2xl font-bold tracking-tight'>Events</h2>
            <p className='text-muted-foreground'>
              Seminars, conferences, thesis defences and calls.
            </p>
          </div>
          <Button
            onClick={() => {
              void navigate({ to: '/admin/events/new' })
            }}
          >
            <Plus /> New event
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={tableNavigate}
          searchPlaceholder='Search by title, location or organiser...'
          urlFilters={[
            { columnId: 'eventType', searchKey: 'eventType', type: 'string' },
            {
              columnId: 'editorialStatus',
              searchKey: 'status',
              type: 'string',
            },
          ]}
          facetFilters={[
            ...(terminos.length === 0
              ? []
              : [
                  {
                    columnId: 'eventType',
                    title: 'Type',
                    options: terminos.map((tipo) => ({
                      label: tipo.label,
                      value: tipo.code,
                    })),
                  },
                ]),
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
                description='No event matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void tableNavigate({
                      search: (prev) => ({
                        ...prev,
                        q: undefined,
                        eventType: undefined,
                        status: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='No events yet'
                description='Create the first one. It will appear on your site as soon as you publish it.'
                action={{
                  label: 'New event',
                  onClick: () => {
                    void navigate({ to: '/admin/events/new' })
                  },
                }}
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
          title='Archive event'
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
          title='Delete event'
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
