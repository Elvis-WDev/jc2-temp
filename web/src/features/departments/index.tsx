import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api/api-error'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { AppDataTable, DataTableColumnHeader } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { VisibilityToggleButton } from '@/components/visibility-toggle-button'
import { ConfigurationLayout } from '@/features/configuration/layout'
import {
  deleteDepartment,
  listDepartments,
  listInstitutions,
  setDepartmentActive,
  type Department,
} from '@/features/institutions/api'
import { DepartmentFormDialog } from './components/department-form-dialog'

const route = getRouteApi('/admin/departments/')

/**
 * Departamentos de todas las instituciones en una sola tabla.
 *
 * El catálogo es corto —un académico trabaja con unas pocas instituciones— así que se
 * trae entero y se pagina y filtra en memoria, igual que los tipos de trabajo.
 */
export function Departments() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Department | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Department | null>(null)
  const [ocultando, setOcultando] = useState<Department | null>(null)
  const [enUso, setEnUso] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.departments.list(),
    queryFn: () => listDepartments(),
  })

  const { data: instituciones } = useQuery({
    queryKey: queryKeys.institutions.list({ page_size: 100 }),
    queryFn: () => listInstitutions({ page: 1, page_size: 100 }),
  })

  const refresca = [queryKeys.departments.all]

  const ocultar = useToastMutation({
    mutationFn: (id: string) => setDepartmentActive(id, false),
    invalidates: refresca,
    success:
      'Department hidden. It can no longer be chosen in courses and affiliations.',
    onSuccess: () => {
      setOcultando(null)
    },
    onError: () => {
      setOcultando(null)
    },
  })

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => setDepartmentActive(id, true),
    invalidates: refresca,
    success: 'Department visible. It can be chosen again.',
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    invalidates: refresca,
    success: 'Department deleted.',
    onSuccess: () => {
      setBorrando(null)
      setEnUso(null)
    },
    onError: (error) => {
      // La API rechaza borrar lo que tiene gente o cursos dentro. Se cuenta dentro del
      // diálogo, con la salida que sí funciona, en lugar de cerrarlo con un error suelto.
      if (error instanceof ApiError && error.code === 'DEPARTMENT_IN_USE') {
        setEnUso(error.message)
        return true
      }
      setBorrando(null)
      return false
    },
  })

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Department' />
        ),
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.original.name}</p>
            {row.original.shortName !== null && (
              <p className='text-xs text-muted-foreground'>
                {row.original.shortName}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'institutionId',
        meta: { className: 'w-64' },
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Institution' />
        ),
        // Se muestra el nombre y se filtra por identificador: dos instituciones pueden
        // llamarse parecido, y el filtro tiene que ser exacto.
        cell: ({ row }) => (
          <span className='text-sm'>{row.original.institutionName}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        meta: { className: 'w-28' },
        filterFn: (row, id, valor) => String(row.getValue(id)) === valor,
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
        meta: { className: 'w-32' },
        cell: ({ row }) => (
          <div className='flex justify-end gap-1'>
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
                setOcultando(row.original)
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
    [mostrar]
  )

  const abrirAlta = () => {
    setEditando(undefined)
    setFormAbierto(true)
  }

  const hayFiltro =
    (search.q !== undefined && search.q !== '') ||
    search.institutionId !== undefined ||
    search.active !== undefined

  return (
    <>
      <ConfigurationLayout>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Departments</h2>
            <p className='text-muted-foreground'>
              Faculties and schools within each institution.
            </p>
          </div>
          <Button onClick={abrirAlta}>
            <Plus /> New department
          </Button>
        </div>

        <AppDataTable
          data={data ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search departments...'
          facetFilters={[
            {
              columnId: 'institutionId',
              title: 'Institution',
              options: (instituciones?.items ?? []).map((institucion) => ({
                label: institucion.name,
                value: institucion.id,
              })),
            },
            {
              columnId: 'isActive',
              title: 'Status',
              options: [
                { label: 'Visibles', value: 'true' },
                { label: 'Ocultos', value: 'false' },
              ],
            },
          ]}
          emptyState={
            isLoading ? null : hayFiltro ? (
              <EmptyState
                variant='no-results'
                title='No matches'
                description='No department matches the current filters.'
              />
            ) : (
              <EmptyState
                title='No departments yet'
                description='Create the first one inside an institution. You need them to record affiliations and course offerings.'
                action={{ label: 'New department', onClick: abrirAlta }}
              />
            )
          }
        />
      </ConfigurationLayout>

      <DepartmentFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { department: editando })}
      />

      {ocultando !== null && (
        <ConfirmDangerDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setOcultando(null)
          }}
          requireTypedName={false}
          name={ocultando.name}
          title={`Hide ${ocultando.name}`}
          description='It can no longer be chosen when recording affiliations and course offerings. What already uses it does not change.'
          warning='You can show it again whenever you want from this same table.'
          confirmText='Hide'
          isLoading={ocultar.isPending}
          onConfirm={() => {
            ocultar.mutate(ocultando.id)
          }}
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
          name={borrando.name}
          title='Delete department'
          description='It will be removed from the list of available departments.'
          warning={
            enUso ??
            'If it has affiliations or course offerings inside, it cannot be deleted. In that case hide it.'
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
