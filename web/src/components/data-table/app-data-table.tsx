import { useEffect, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from './pagination'
import { DataTableToolbar } from './toolbar'

/**
 * Tabla de datos compartida (`component-system.md:21`).
 *
 * Extraída de la tabla de la plantilla y generalizada. Sostiene los dos modos que
 * necesita el panel:
 *
 *  - **cliente**: la colección entera llega de una vez y TanStack Table filtra,
 *    ordena y pagina en memoria. Vale para catálogos cortos (tipos de trabajo,
 *    departamentos).
 *  - **servidor**: la API filtra y pagina (PERF-001) y la tabla solo pinta. Es el
 *    modo de works, courses, media y personas, donde la colección puede crecer sin
 *    límite.
 *
 * El estado vive en la URL en ambos modos, de modo que un listado filtrado se puede
 * compartir por enlace y sobrevive a recargar (`data-tables.md:40-47`).
 */

export type DataTableFilterOption = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export type DataTableFacetFilter = {
  columnId: string
  title: string
  options: DataTableFilterOption[]
  /** Varias opciones a la vez. Por defecto una sola, que es lo que espera la API. */
  multiple?: boolean
}

/** Declaración de un filtro que se refleja en la URL. */
export type UrlColumnFilter =
  | { columnId: string; searchKey: string; type?: 'string' }
  | { columnId: string; searchKey: string; type: 'array' }

type ServerMode = {
  /** Total de la colección según la API, no el número de filas recibidas. */
  rowCount: number
  isLoading?: boolean
}

type AppDataTableProps<TData> = {
  data: TData[]
  columns: ColumnDef<TData>[]
  search: Record<string, unknown>
  navigate: NavigateFn

  searchKey?: string
  searchPlaceholder?: string
  facetFilters?: DataTableFacetFilter[]
  urlFilters?: UrlColumnFilter[]
  /** Filtros del módulo que no son una lista de opciones (un rango de fechas, etc.). */
  extraFilters?: React.ReactNode

  defaultPageSize?: number
  enableRowSelection?: boolean

  /** Presente = paginación de servidor. Ausente = paginación en memoria. */
  server?: ServerMode

  /** Qué mostrar cuando no hay filas. Distingue "sin datos" de "sin coincidencias". */
  emptyState?: React.ReactNode
  bulkActions?: (table: TanStackTable<TData>) => React.ReactNode
}

export function AppDataTable<TData>({
  data,
  columns,
  search,
  navigate,
  searchKey,
  searchPlaceholder = 'Search...',
  facetFilters = [],
  urlFilters = [],
  extraFilters,
  defaultPageSize = 20,
  enableRowSelection = false,
  server,
  emptyState,
  bulkActions,
}: AppDataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])

  const esServidor = server !== undefined

  const {
    globalFilter,
    onGlobalFilterChange,
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize },
    globalFilter: { enabled: searchKey === undefined, key: 'q', trim: true },
    columnFilters: urlFilters,
  })

  // El parametro de tipo va explicito: con los spreads condicionales de mas abajo,
  // TypeScript pierde la inferencia y colapsa TData en `unknown`.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<TData>({
    data,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
      ...(globalFilter === undefined ? {} : { globalFilter }),
    },
    enableRowSelection,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    ...(onGlobalFilterChange === undefined ? {} : { onGlobalFilterChange }),

    getCoreRowModel: getCoreRowModel(),

    // En modo servidor NO se montan los modelos de filtrado, orden y paginación en
    // memoria: la API ya devolvió la página exacta, y dejarlos activos volvería a
    // filtrar sobre esas filas y escondería resultados legítimos.
    ...(esServidor
      ? {
          manualPagination: true,
          manualFiltering: true,
          rowCount: server.rowCount,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFacetedRowModel: getFacetedRowModel(),
          getFacetedUniqueValues: getFacetedUniqueValues(),
        }),
  })

  useEffect(() => {
    // Si se borra el último elemento de la última página, la página actual deja de
    // existir y la tabla se quedaría vacía sin explicación.
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  const filas = table.getRowModel().rows
  const cargando = server?.isLoading === true

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        {...(searchKey === undefined ? {} : { searchKey })}
        filters={facetFilters}
        {...(extraFilters === undefined ? {} : { extraFilters })}
      />

      <div className='overflow-hidden rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {cargando ? (
              // Esqueletos dentro del marco de la tabla: preservan la geometría y
              // evitan el salto de layout que produce un spinner a pantalla completa
              // (`data-tables.md:87-91`).
              Array.from({ length: 5 }).map((_, fila) => (
                <TableRow key={`skeleton-${String(fila)}`}>
                  {columns.map((_columna, celda) => (
                    <TableCell
                      key={`skeleton-${String(fila)}-${String(celda)}`}
                    >
                      <Skeleton className='h-5 w-full' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filas.length > 0 ? (
              filas.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  {emptyState ?? 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />
      {bulkActions?.(table)}
    </div>
  )
}
