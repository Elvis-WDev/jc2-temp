import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
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
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import { VisibilityToggleButton } from '@/components/visibility-toggle-button'
import { deleteVenue, listVenues, updateVenue, type Venue } from './api'
import { VenueFormDialog } from './components/venue-form-dialog'

const route = getRouteApi('/admin/venues/')

/**
 * Revistas, editoriales y congresos.
 *
 * Antes el nombre y el ISSN se reescribían en cada trabajo y no había sitio para el
 * ranking ni el CiteScore. Aquí se escribe una vez y lo reutilizan todos.
 */
export function Venues() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Venue | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Venue | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const { terminos, etiqueta: etiquetaTipo } = useCatalogTerms('venue')

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.venueType === undefined ? {} : { venueType: search.venueType }),
    ...(search.active === undefined ? {} : { active: search.active }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.venues.list(params),
    queryFn: () => listVenues(params),
  })

  const refresca = [queryKeys.venues.all, queryKeys.works.all]

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => updateVenue(id, { isActive: true }),
    invalidates: refresca,
    success: 'Venue visible. It can be chosen for work again.',
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => updateVenue(id, { isActive: false }),
    invalidates: refresca,
    success: 'Venue hidden. The work that cites it does not change.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteVenue(id),
    invalidates: refresca,
    success: 'Venue deleted.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'VENUE_IN_USE') {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<Venue>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Venue' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.name}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {[
                row.original.abbreviation,
                row.original.publisherName,
                row.original.issn === null ? null : `ISSN ${row.original.issn}`,
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
        accessorKey: 'venueType',
        meta: { className: 'w-40' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Type' />
        ),
        cell: ({ row }) =>
          row.original.venueType === null ? (
            <span className='text-muted-foreground'>—</span>
          ) : (
            <StatusBadge tone='neutral' dot={false}>
              {etiquetaTipo(row.original.venueType)}
            </StatusBadge>
          ),
      },
      {
        id: 'calidad',
        meta: { className: 'w-40' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Quality' />
        ),
        cell: ({ row }) => {
          const { ranking, citeScore } = row.original
          if (ranking === null && citeScore === null) {
            return <span className='text-muted-foreground'>—</span>
          }
          return (
            <div className='flex flex-wrap gap-1'>
              {ranking !== null && (
                <StatusBadge tone='info'>{ranking}</StatusBadge>
              )}
              {citeScore !== null && (
                <StatusBadge tone='neutral' dot={false}>
                  CiteScore {citeScore}
                </StatusBadge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'workCount',
        meta: { className: 'w-28 text-end tabular-nums' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Works' />
        ),
        cell: ({ row }) => row.original.workCount,
      },
      {
        accessorKey: 'isActive',
        meta: { className: 'w-28' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone='success'>Visible</StatusBadge>
          ) : (
            <StatusBadge tone='neutral'>Hidden</StatusBadge>
          ),
      },
      {
        id: 'actions',
        meta: { className: 'w-36' },
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
            {row.original.websiteUrl !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    asChild
                    aria-label={`Open the website of ${row.original.name}`}
                  >
                    <a
                      href={row.original.websiteUrl}
                      target='_blank'
                      rel='noreferrer'
                    >
                      <ExternalLink className='size-4' />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open its website</TooltipContent>
              </Tooltip>
            )}
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
    [etiquetaTipo, mostrar, ocultar]
  )

  const abrirAlta = () => {
    setEditando(undefined)
    setFormAbierto(true)
  }

  const hayFiltro =
    (search.q !== undefined && search.q !== '') ||
    search.venueType !== undefined ||
    search.active !== undefined

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
            <h2 className='text-2xl font-bold tracking-tight'>Venues</h2>
            <p className='text-muted-foreground'>
              Journals, publishers and conferences where you publish, with their
              ranking.
            </p>
          </div>
          <Button onClick={abrirAlta}>
            <Plus /> New venue
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search by name, abbreviation or ISSN...'
          urlFilters={[
            { columnId: 'venueType', searchKey: 'venueType', type: 'string' },
            { columnId: 'isActive', searchKey: 'active', type: 'string' },
          ]}
          facetFilters={[
            ...(terminos.length === 0
              ? []
              : [
                  {
                    columnId: 'venueType',
                    title: 'Type',
                    options: terminos.map((tipo) => ({
                      label: tipo.label,
                      value: tipo.code,
                    })),
                  },
                ]),
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
                description='No venue matches the current filters.'
                action={{
                  label: 'Clear filters',
                  onClick: () => {
                    void navigate({
                      search: (prev) => ({
                        ...prev,
                        q: undefined,
                        venueType: undefined,
                        active: undefined,
                        page: 1,
                      }),
                    })
                  },
                }}
              />
            ) : (
              <EmptyState
                title='No venues yet'
                description='Create the first one. That way the ISSN and the ranking are written once and reused by all your work.'
                action={{ label: 'New venue', onClick: abrirAlta }}
              />
            )
          }
        />
      </Main>

      <VenueFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { venue: editando })}
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
          title='Delete venue'
          description='It will be removed from the venue list.'
          warning={
            enUso ??
            'If any work cites it, it cannot be deleted. In that case hide it: it stops being offered and the work that cites it does not change.'
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
