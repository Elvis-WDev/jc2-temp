import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { queryKeys } from '@/lib/api/query-keys'
import { useToastMutation } from '@/hooks/use-toast-mutation'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { ConfirmDangerDialog } from '@/components/confirm-danger-dialog'
import { AppDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { listTagCategories, listTags, setTagActive, type Tag } from './api'
import { TagDeleteDialog } from './components/tag-delete-dialog'
import { TagFormDialog } from './components/tag-form-dialog'
import { tagsColumns } from './components/tags-columns'

const route = getRouteApi('/admin/tags/')

export function Tags() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const [editando, setEditando] = useState<Tag | undefined>(undefined)
  const [formAbierto, setFormAbierto] = useState(false)
  const [borrando, setBorrando] = useState<Tag | null>(null)
  const [ocultando, setOcultando] = useState<Tag | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.active === undefined ? {} : { active: search.active }),
    ...(search.category === undefined ? {} : { category: search.category }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tags.list(params),
    queryFn: () => listTags(params),
  })

  // Las categorias son texto libre, asi que el filtro las saca de las que existen.
  const { data: categorias } = useQuery({
    queryKey: queryKeys.tags.categories,
    queryFn: listTagCategories,
  })

  const ocultar = useToastMutation({
    mutationFn: (id: string) => setTagActive(id, false),
    invalidates: [queryKeys.tags.all],
    success: 'Tag hidden. It can no longer be assigned to new work.',
    onSuccess: () => {
      setOcultando(null)
    },
    onError: () => {
      setOcultando(null)
    },
  })

  const { mutate: mostrar } = useToastMutation({
    mutationFn: (id: string) => setTagActive(id, true),
    invalidates: [queryKeys.tags.all],
    success: 'Tag visible. It can be assigned to work again.',
  })

  const columns = useMemo(
    () =>
      tagsColumns({
        onEdit: (tag) => {
          setEditando(tag)
          setFormAbierto(true)
        },
        onHide: setOcultando,
        onShow: (tag) => {
          mostrar(tag.id)
        },
        onDelete: setBorrando,
      }),
    [mostrar]
  )

  const hayFiltro =
    (search.q !== undefined && search.q !== '') ||
    search.active !== undefined ||
    search.category !== undefined

  const limpiarFiltros = () => {
    void navigate({
      search: (prev) => ({
        ...prev,
        q: undefined,
        active: undefined,
        category: undefined,
        page: 1,
      }),
    })
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
            <h2 className='text-2xl font-bold tracking-tight'>Tags</h2>
            <p className='text-muted-foreground'>
              Topics you classify your work and courses with.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditando(undefined)
              setFormAbierto(true)
            }}
          >
            <Plus /> New tag
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={navigate}
          searchPlaceholder='Search tags...'
          urlFilters={[
            { columnId: 'isActive', searchKey: 'active', type: 'string' },
            { columnId: 'category', searchKey: 'category', type: 'string' },
          ]}
          facetFilters={[
            {
              columnId: 'isActive',
              title: 'Status',
              options: [
                { label: 'Visibles', value: 'true' },
                { label: 'Ocultas', value: 'false' },
              ],
            },
            // Sin categorias creadas, el filtro no aparece: un desplegable vacio solo
            // hace pensar que algo se ha roto.
            ...((categorias ?? []).length === 0
              ? []
              : [
                  {
                    columnId: 'category',
                    title: 'Category',
                    options: (categorias ?? []).map((categoria) => ({
                      label: categoria,
                      value: categoria,
                    })),
                  },
                ]),
          ]}
          server={{
            rowCount: data?.meta.pagination.totalItems ?? 0,
            isLoading,
          }}
          emptyState={
            // Se distingue "no hay nada" de "los filtros no encuentran": pedirle al
            // usuario que limpie filtros cuando no ha creado nada es desorientarlo.
            hayFiltro ? (
              <EmptyState
                variant='no-results'
                title='No matches'
                description='No tag matches the current filters.'
                action={{ label: 'Clear filters', onClick: limpiarFiltros }}
              />
            ) : (
              <EmptyState
                title='No tags yet'
                description='Create the first one so you can classify work and courses.'
                action={{
                  label: 'New tag',
                  onClick: () => {
                    setEditando(undefined)
                    setFormAbierto(true)
                  },
                }}
              />
            )
          }
        />
      </Main>

      <TagFormDialog
        open={formAbierto}
        onOpenChange={setFormAbierto}
        {...(editando === undefined ? {} : { tag: editando })}
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
          description='It can no longer be assigned to new work and courses. Those that already carry it keep it.'
          warning='You can show it again whenever you want from this same table.'
          confirmText='Hide'
          isLoading={ocultar.isPending}
          onConfirm={() => {
            ocultar.mutate(ocultando.id)
          }}
        />
      )}

      {borrando !== null && (
        <TagDeleteDialog
          open
          onOpenChange={(abierto) => {
            if (!abierto) setBorrando(null)
          }}
          tag={borrando}
        />
      )}
    </>
  )
}
