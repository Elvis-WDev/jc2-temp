import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
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
import {
  archiveWork,
  deleteWork,
  listWorks,
  publishWork,
  type EditorialStatus,
  type Work,
} from './api'
import { worksColumns } from './components/works-columns'

const route = getRouteApi('/admin/works/')

export function Works() {
  const search = route.useSearch()
  const tableNavigate = route.useNavigate()
  const navigate = useNavigate()

  const [borrando, setBorrando] = useState<Work | null>(null)
  const [archivando, setArchivando] = useState<Work | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.status === undefined
      ? {}
      : { status: search.status as EditorialStatus }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.works.list(params),
    queryFn: () => listWorks(params),
  })

  const refresca = [queryKeys.works.all, queryKeys.dashboard] as const

  const { mutate: publicar } = useToastMutation({
    mutationFn: (id: string) => publishWork(id),
    invalidates: refresca,
    success: 'Work published. It now appears on the site.',
  })

  // Archivar retira el trabajo de la web publica, asi que se pregunta antes. Se deshace
  // volviendo a publicar, por eso no hace falta escribir el titulo.
  const archivar = useToastMutation({
    mutationFn: (id: string) => archiveWork(id),
    invalidates: refresca,
    success:
      'Work archived. It has been withdrawn from the site and the home page.',
    onSuccess: () => {
      setArchivando(null)
    },
    onError: () => {
      setArchivando(null)
    },
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteWork(id),
    invalidates: refresca,
    success: 'Work deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo(
    () =>
      worksColumns({
        onEdit: (work) => {
          void navigate({
            to: '/admin/works/$workId',
            params: { workId: work.id },
          })
        },
        onPublish: (work) => {
          publicar(work.id)
        },
        onArchive: setArchivando,
        onDelete: setBorrando,
      }),
    [navigate, publicar]
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
            <h2 className='text-2xl font-bold tracking-tight'>Work</h2>
            <p className='text-muted-foreground'>
              Your articles, books, chapters and working papers.
            </p>
          </div>
          <Button
            onClick={() => {
              void navigate({ to: '/admin/works/new' })
            }}
          >
            <Plus /> New work
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={tableNavigate}
          searchPlaceholder='Search by title, journal or DOI...'
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
                description='No work matches the current filters.'
                action={{
                  label: 'Limpiar filtros',
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
                title='No work yet'
                description='Create the first one. It will appear on your site as soon as you publish it.'
                action={{
                  label: 'New work',
                  onClick: () => {
                    void navigate({ to: '/admin/works/new' })
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
          title='Archive work'
          description='It will be withdrawn from the public site and the home page. You still keep it whole here.'
          warning='You can publish it again whenever you want.'
          confirmText='Archivar'
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
          title='Delete work'
          description='It will be deleted forever, along with its authors, links and associated files.'
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
