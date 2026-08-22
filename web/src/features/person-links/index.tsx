import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { getProfile } from '@/features/profile/api'
import { deletePersonLink, listPersonLinks, type PersonLink } from './api'
import { LinkFormDialog } from './components/link-form-dialog'

const route = getRouteApi('/admin/person-links/')

export function PersonLinks() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<PersonLink | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<PersonLink | null>(null)
  const { etiqueta } = useCatalogTerms('person_link')

  const { data: perfil } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getProfile,
  })
  const personId = perfil?.id

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.personLinks.list(personId ?? ''),
    queryFn: () => listPersonLinks(personId as string),
    enabled: personId !== undefined,
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deletePersonLink(id),
    invalidates: [queryKeys.personLinks.all],
    success: 'Link deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo<ColumnDef<PersonLink>[]>(
    () => [
      {
        accessorKey: 'linkType',
        meta: { className: 'w-44' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Type' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{etiqueta(row.original.linkType)}</span>
        ),
      },
      {
        accessorKey: 'url',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Address' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            {row.original.label !== null && (
              <p className='truncate text-sm'>{row.original.label}</p>
            )}
            <a
              href={row.original.url}
              target='_blank'
              rel='noreferrer'
              className='inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:underline'
            >
              <span className='truncate'>{row.original.url}</span>
              <ExternalLink className='size-3 shrink-0' aria-hidden />
            </a>
          </div>
        ),
      },
      {
        id: 'logo',
        meta: { className: 'w-44' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Home page' />
        ),
        // De un vistazo y sin abrir cada fila: un enlace sin logotipo no sale en la
        // portada, y antes no habia forma de saberlo mas que echandolo en falta alli.
        cell: ({ row }) =>
          row.original.iconMediaId === null ? (
            <span className='text-xs text-muted-foreground'>
              No logo: footer only
            </span>
          ) : (
            <StatusBadge tone='success'>With logo</StatusBadge>
          ),
      },
      {
        accessorKey: 'isPublic',
        meta: { className: 'w-40' },
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
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
        id: 'actions',
        meta: { className: 'w-24' },
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`Edit ${row.original.url}`}
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
                  aria-label={`Delete ${row.original.url}`}
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
    [etiqueta]
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
            <h2 className='text-2xl font-bold tracking-tight'>Links</h2>
            <p className='text-muted-foreground'>
              The logos under the buttons of your home page.{' '}
              <strong>Only the ones with a logo appear there</strong>; the rest
              are listed by name in the footer.
            </p>
          </div>
          <Button onClick={abrirAlta} disabled={personId === undefined}>
            <Plus /> New link
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search links...'
          facetFilters={[
            {
              columnId: 'isPublic',
              title: 'Visibility',
              options: [
                { label: 'Visible on the site', value: 'true' },
                { label: 'Only you', value: 'false' },
              ],
            },
          ]}
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='No links yet'
                description='Your ORCID, your Google Scholar, your website. Upload a logo for each one you want under the buttons of your home page.'
                action={{ label: 'New link', onClick: abrirAlta }}
              />
            )
          }
        />
      </Main>

      {personId !== undefined && (
        <LinkFormDialog
          open={formAbierto}
          onOpenChange={setFormAbierto}
          personId={personId}
          {...(editando === undefined ? {} : { link: editando })}
        />
      )}

      {borrando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          name={borrando.url}
          title='Delete link'
          description='It will no longer appear on your public profile.'
          warning='If you only want it to stop appearing, edit it and turn off its visibility.'
          isLoading={borrar.isPending}
          onConfirm={() => {
            borrar.mutate(borrando.id)
          }}
        />
      )}
    </>
  )
}
