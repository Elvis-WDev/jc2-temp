import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type PublicCourseSummary } from '../api'
import { CourseCard } from './course-card'

const getCourse = vi.fn()

vi.mock('../api', () => ({ getCourse: (slug: string) => getCourse(slug) }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const CURSO: PublicCourseSummary = {
  id: 'c1',
  slug: 'econ-820',
  title: 'Economia conductual avanzada',
  shortTitle: null,
  level: 'graduate',
  code: 'ECON 820',
  summary: 'Fundamentos psicologicos del comportamiento economico.',
  tags: [{ slug: 'conductual', name: 'Conductual' }],
  currentOffering: {
    institution: 'Universidad Nacional',
    department: null,
    term: 'Otono',
    academicYear: 2026,
    teachingRole: null,
    isActive: true,
  },
  offeringCount: 3,
}

const FICHA = {
  descriptionHtml: '<p>Contenido completo del seminario.</p>',
  offerings: [
    {
      id: 'e1',
      name: null,
      institution: 'Universidad Nacional',
      department: null,
      code: 'ECON 820',
      term: 'Otono',
      academicYear: 2026,
      startDate: null,
      endDate: null,
      role: null,
      teachers: [{ name: 'Juana Castro', role: 'Titular' }],
      isActive: true,
      summary: null,
      contentHtml: null,
      materials: [
        {
          type: 'syllabus',
          typeLabel: 'Guia docente',
          title: 'Programa 2026',
          description: null,
          url: 'https://ejemplo.edu/guia.pdf',
          isExternal: true,
        },
      ],
    },
  ],
}

function pintar(course = CURSO) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CourseCard course={course} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getCourse.mockResolvedValue(FICHA)
})

describe('tarjeta de un curso', () => {
  it('muestra codigo, periodo y resumen', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('ECON 820')).toBeVisible()
    await expect.element(screen.getByText('Otono 2026')).toBeVisible()
    await expect
      .element(
        screen.getByText(
          'Fundamentos psicologicos del comportamiento economico.'
        )
      )
      .toBeVisible()
  })

  it('distingue lo que esta en marcha de lo historico', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('Running')).toBeVisible()
  })

  it('un curso sin edicion activa se marca como historico', async () => {
    const screen = await pintar({
      ...CURSO,
      currentOffering: { ...CURSO.currentOffering!, isActive: false },
    })
    await expect.element(screen.getByText('Past')).toBeVisible()
  })

  it('NO pide la ficha mientras este cerrada', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('ECON 820')).toBeVisible()

    expect(getCourse).not.toHaveBeenCalled()
  })

  it('al desplegarla aparecen las ediciones, quien la dio y sus materiales', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /see more/i }))

    await expect
      .element(screen.getByText('Contenido completo del seminario.'))
      .toBeVisible()
    await expect
      .element(screen.getByText(/Juana Castro \(Titular\)/))
      .toBeVisible()
    await expect.element(screen.getByText('Programa 2026')).toBeVisible()
    expect(getCourse).toHaveBeenCalledWith('econ-820')
  })

  it('el tipo de material se lee, no es un codigo', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /see more/i }))

    await expect.element(screen.getByText('(Guia docente)')).toBeVisible()
  })

  it('un curso sin ediciones publicadas lo dice', async () => {
    getCourse.mockResolvedValue({ descriptionHtml: null, offerings: [] })
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /see more/i }))

    await expect
      .element(screen.getByText('This course has no published offerings yet.'))
      .toBeVisible()
  })
})
