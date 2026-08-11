import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
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
import { StatusBadge } from '@/components/status-badge'
import { ThemeSwitch } from '@/components/theme-switch'
import { getProfile } from '@/features/profile/api'
import { deleteAffiliation, listAffiliations, type Affiliation } from './api'
import { AffiliationFormDialog } from './components/affiliation-form-dialog'

const route = getRouteApi('/admin/affiliations/')

const MES = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  year: 'numeric',
})

/** "mar 2020 – jun 2024", o "desde mar 2020" si sigue vigente. */
function periodo(desde: string | null, hasta: string | null): string {
  const texto = (fecha: string) => MES.format(new Date(`${fecha}T00:00:00`))
  if (desde === null && hasta === null) return '—'
  if (hasta === null) return `Desde ${texto(desde as string)}`
  if (desde === null) return `Hasta ${texto(hasta)}`
  return `${texto(desde)} – ${texto(hasta)}`
}

export function Affiliations() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Affiliation | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Affiliation | null>(null)
  const { etiqueta: etiquetaVinculo } = useCatalogTerms('affiliation')

  // Las afiliaciones cuelgan de una persona; aqui esa persona es siempre el titular
  // del sitio, que es de quien va este panel.
  const { data: perfil } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  })
  const personId = perfil?.id

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.affiliations.list(personId ?? ''),
    queryFn: () => listAffiliations(personId as string),
    enabled: personId !== undefined,
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteAffiliation(id),
    invalidates: [queryKeys.affiliations.all],
    success: 'Afiliacion eliminada.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<Affiliation>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Role' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.title}</p>
            {row.original.affiliationType !== null && (
              <p className='text-xs text-muted-foreground'>
                {etiquetaVinculo(row.original.affiliationType)}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'institutionName',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Where' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate'>{row.original.institutionName}</p>
            {row.original.departmentName !== null && (
              <p className='text-xs text-muted-foreground'>
                {row.original.departmentName}
              </p>
            )}
          </div>
        ),
      },
      {
        id: 'periodo',
        meta: { className: 'w-44' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Term' />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>
            {periodo(row.original.startDate, row.original.endDate)}
          </span>
        ),
      },
      {
        accessorKey: 'isCurrent',
        meta: { className: 'w-44' },
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {row.original.isCurrent ? (
              <StatusBadge tone='success'>Vigente</StatusBadge>
            ) : (
              <StatusBadge tone='neutral'>Pasada</StatusBadge>
            )}
            {row.original.isPrimary && (
              <StatusBadge tone='info'>Primary</StatusBadge>
            )}
          </div>
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
                  aria-label={`Edit ${row.original.title}`}
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
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Delete ${row.original.title}`}
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
    [etiquetaVinculo]
  )

  const abrirAlta = () => {
    setEditando(undefined)
    setFormAbierto(true)
  }

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
            <h2 className='text-2xl font-bold tracking-tight'>Affiliations</h2>
            <p className='text-muted-foreground'>
              Where you work or have worked. They appear on your public profile.
            </p>
          </div>
          <Button onClick={abrirAlta} disabled={personId === undefined}>
            <Plus /> New affiliation
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search by role or institution...'
          facetFilters={[
            {
              columnId: 'isCurrent',
              title: 'Status',
              options: [
                { label: 'Vigentes', value: 'true' },
                { label: 'Pasadas', value: 'false' },
              ],
            },
          ]}
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='No affiliations yet'
                description='Add where you work. It is what appears under your name on the site.'
                action={{ label: 'New affiliation', onClick: abrirAlta }}
              />
            )
          }
        />
      </Main>

      {personId !== undefined && (
        <AffiliationFormDialog
          open={formAbierto}
          onOpenChange={setFormAbierto}
          personId={personId}
          {...(editando === undefined ? {} : { affiliation: editando })}
        />
      )}

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          name={borrando.title}
          title='Delete affiliation'
          description='It will no longer appear on your public profile.'
          warning='If it has merely ended, edit it and set the end date instead of deleting it: that way the history is kept.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
