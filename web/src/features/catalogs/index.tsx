import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  CATALOGS,
  deleteCatalogTerm,
  listCatalogTerms,
  NOMBRE_DE_CATALOGO,
  QUE_ES_CATALOGO,
  updateCatalogTerm,
  type Catalog,
  type CatalogTerm,
} from './api'
import { TermFormDialog } from './components/term-form-dialog'

const route = getRouteApi('/admin/catalogs/')

/**
 * Las listas de opciones del panel, editables.
 *
 * Antes vivían escritas a mano en el código: se podían ampliar, pero no desde la
 * aplicación. Aquí se añaden, renombran, reordenan y ocultan.
 */
export function Catalogs() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const catalogo = (search.catalog ?? CATALOGS[0]) as Catalog

  const [editando, setEditando] = useState<CatalogTerm | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<CatalogTerm | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.catalogTerms.list(catalogo, false),
    queryFn: () => listCatalogTerms(catalogo),
  })

  // Se memoiza porque las columnas dependen de la lista para saber si un termino es el
  // primero o el ultimo: sin esto, `?? []` daria un array nuevo en cada render y las
  // columnas se reconstruirian siempre.
  const terminos = useMemo(() => data ?? [], [data])
  const refresca = [queryKeys.catalogTerms.all]

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => updateCatalogTerm(id, { isActive: true }),
    invalidates: refresca,
    success: 'Term visible. It is offered in the forms again.',
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => updateCatalogTerm(id, { isActive: false }),
    invalidates: refresca,
    success:
      'Term hidden. It stops being offered, but what already uses it does not change.',
  })

  // Reordenar intercambia la posición con el vecino: dos filas, una acción entendible.
  const { mutate: mover } = useToastMutation({
    mutationFn: async ({
      termino,
      hacia,
    }: {
      termino: CatalogTerm
      hacia: -1 | 1
    }) => {
      const indice = terminos.findIndex((actual) => actual.id === termino.id)
      const vecino = terminos[indice + hacia]
      if (vecino === undefined) return
      await updateCatalogTerm(termino.id, { sortOrder: vecino.sortOrder })
      await updateCatalogTerm(vecino.id, { sortOrder: termino.sortOrder })
    },
    invalidates: refresca,
    success: 'Order updated.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteCatalogTerm(id),
    invalidates: refresca,
    success: 'Termino eliminado.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      // Con registros que lo usan, la API responde 409. Se cuenta dentro del diálogo,
      // con la salida que sí funciona, en lugar de cerrarlo con un error suelto.
      if (error instanceof ApiError && error.code === 'CATALOG_TERM_IN_USE') {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<CatalogTerm>[]>(
    () => [
      {
        accessorKey: 'label',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Name' />
        ),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.label}</span>
        ),
      },
      {
        accessorKey: 'code',
        meta: { className: 'w-56' },
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
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Status' />
        ),
        cell: ({ row }) =>
          row.original.isActive ? (
            <StatusBadge tone='success'>Offered</StatusBadge>
          ) : (
            <StatusBadge tone='neutral'>Hidden</StatusBadge>
          ),
      },
      {
        id: 'actions',
        meta: { className: 'w-44' },
        cell: ({ row }) => {
          const indice = terminos.findIndex(
            (actual) => actual.id === row.original.id
          )

          return (
            <div className='flex justify-end gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={indice <= 0}
                    aria-label={`Move ${row.original.label} up`}
                    onClick={() => {
                      mover({ termino: row.original, hacia: -1 })
                    }}
                  >
                    <ArrowUp className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {indice <= 0 ? 'It is already first' : 'Move up'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={indice >= terminos.length - 1}
                    aria-label={`Move ${row.original.label} down`}
                    onClick={() => {
                      mover({ termino: row.original, hacia: 1 })
                    }}
                  >
                    <ArrowDown className='size-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {indice >= terminos.length - 1
                    ? 'It is already last'
                    : 'Move down'}
                </TooltipContent>
              </Tooltip>

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
                    aria-label={`Delete ${row.original.label}`}
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
          )
        },
      },
    ],
    [terminos, mover, mostrar, ocultar]
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
            <h2 className='text-2xl font-bold tracking-tight'>Catalogues</h2>
            <p className='text-muted-foreground'>
              The options offered by the dropdowns of the panel.
            </p>
          </div>
          <Button onClick={abrirAlta}>
            <Plus /> New term
          </Button>
        </div>

        <div className='grid gap-2 sm:max-w-md'>
          <Select
            value={catalogo}
            onValueChange={(valor) => {
              // El selector entrega texto suelto; la ruta solo admite los catalogos
              // conocidos, que son justo los que se pintan abajo.
              const elegido = valor as Catalog
              void navigate({
                search: (prev) => ({ ...prev, catalog: elegido, page: 1 }),
              })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOGS.map((clave) => (
                <SelectItem key={clave} value={clave}>
                  {NOMBRE_DE_CATALOGO[clave]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className='text-sm text-muted-foreground'>
            {QUE_ES_CATALOGO[catalogo]}
          </p>
        </div>

        <AppDataTable
          data={terminos}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search terms...'
          facetFilters={[
            {
              columnId: 'isActive',
              title: 'Status',
              options: [
                { label: 'Offered', value: 'true' },
                { label: 'Ocultos', value: 'false' },
              ],
            },
          ]}
          emptyState={
            isLoading ? null : (
              <EmptyState
                title='This list is empty'
                description='Add the first term so it appears in the dropdowns.'
                action={{ label: 'New term', onClick: abrirAlta }}
              />
            )
          }
        />
      </Main>

      <TermFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        catalog={catalogo}
        {...(editando === undefined ? {} : { term: editando })}
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
          name={borrando.label}
          title='Delete term'
          description='It will no longer exist in this list.'
          warning={
            enUso ??
            'If any record uses it, it cannot be deleted. In that case hide it: it stops being offered and what already uses it does not change.'
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
