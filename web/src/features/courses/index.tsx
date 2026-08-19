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
  archiveCourse,
  deleteCourse,
  listCourses,
  publishCourse,
  type Course,
  type EditorialStatus,
} from './api'
import { coursesColumns } from './components/courses-columns'

const route = getRouteApi('/admin/courses/')

export function Courses() {
  const search = route.useSearch()
  const tableNavigate = route.useNavigate()
  const navigate = useNavigate()

  const [borrando, setBorrando] = useState<Course | null>(null)
  const [archivando, setArchivando] = useState<Course | null>(null)

  const params = {
    page: search.page ?? 1,
    page_size: search.pageSize ?? 20,
    ...(search.q === undefined || search.q === '' ? {} : { q: search.q }),
    ...(search.status === undefined
      ? {}
      : { status: search.status as EditorialStatus }),
  }

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.courses.list(params),
    queryFn: () => listCourses(params),
  })

  const refresca = [queryKeys.courses.all, queryKeys.dashboard] as const

  const { mutate: publicar } = useToastMutation({
    mutationFn: (id: string) => publishCourse(id),
    invalidates: refresca,
    success: 'Course published. It now appears on the site.',
  })

  const archivar = useToastMutation({
    mutationFn: (id: string) => archiveCourse(id),
    invalidates: refresca,
    success:
      'Course archived. It has been withdrawn from the site and the home page.',
    onSuccess: () => {
      setArchivando(null)
    },
    onError: () => {
      setArchivando(null)
    },
  })

  const borrar = useToastMutation({
    mutationFn: (id: string) => deleteCourse(id),
    invalidates: refresca,
    success: 'Course deleted.',
    onSuccess: () => {
      setBorrando(null)
    },
    onError: () => {
      setBorrando(null)
    },
  })

  const columns = useMemo(
    () =>
      coursesColumns({
        onEdit: (curso) => {
          void navigate({
            to: '/admin/courses/$courseId',
            params: { courseId: curso.id },
          })
        },
        onPublish: (curso) => {
          publicar(curso.id)
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
            <h2 className='text-2xl font-bold tracking-tight'>Courses</h2>
            <p className='text-muted-foreground'>
              The subjects you teach, with each time you have taught them.
            </p>
          </div>
          <Button
            onClick={() => {
              void navigate({ to: '/admin/courses/new' })
            }}
          >
            <Plus /> New course
          </Button>
        </div>

        <AppDataTable
          data={data?.items ?? []}
          columns={columns}
          search={search as Record<string, unknown>}
          navigate={tableNavigate}
          searchPlaceholder='Search by title...'
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
                description='No course matches the current filters.'
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
                title='No courses yet'
                description='Create the first one. It will appear on your site as soon as you publish it.'
                action={{
                  label: 'New course',
                  onClick: () => {
                    void navigate({ to: '/admin/courses/new' })
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
          title='Archive course'
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
          title='Delete course'
          description='It will be deleted forever, along with its offerings and their materials.'
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
