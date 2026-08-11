import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type PublicWorkSummary } from '../api'
import { WorkCard } from './work-card'

const getWork = vi.fn()

vi.mock('../api', () => ({ getWork: (slug: string) => getWork(slug) }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <a className={className}>{children}</a>,
}))

const TRABAJO: PublicWorkSummary = {
  id: 'w1',
  slug: 'carbono',
  title: 'Asimetria de informacion en mercados de carbono',
  subtitle: null,
  type: { code: 'journal_article', label: 'Articulo' },
  academicStatus: 'published',
  academicStatusLabel: 'Publicado',
  year: 2024,
  venue: 'The Quarterly Journal of Economics',
  venueAbbreviation: 'QJE',
  venueRanking: null,
  volume: '139',
  issue: '2',
  doi: '10.1/x',
  doiUrl: 'https://doi.org/10.1/x',
  isOpenAccess: false,
  authors: ['Juana Castro', 'Ana Soto'],
  tags: [],
  pdfUrl: '/api/public/media/abc',
}

const FICHA = {
  abstractHtml: '<p>Este trabajo estudia los costes de busqueda.</p>',
  links: [
    {
      type: 'dataset',
      label: 'Datos de replicacion',
      url: 'https://datos.ejemplo',
    },
  ],
}

function pintar(work = TRABAJO) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkCard work={work} ownerName='Juana Castro' />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getWork.mockResolvedValue(FICHA)
})

describe('tarjeta de una publicacion', () => {
  it('muestra tipo, ano, estado y la referencia de la revista', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Articulo')).toBeVisible()
    await expect.element(screen.getByText('2024')).toBeVisible()
    await expect.element(screen.getByText('Publicado')).toBeVisible()
    await expect
      .element(
        screen.getByText('The Quarterly Journal of Economics, Vol. 139 (2)')
      )
      .toBeVisible()
  })

  it('descuenta al titular de los coautores', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('with Ana Soto')).toBeVisible()
  })

  it('NO pide la ficha mientras el resumen este cerrado', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText(/Asimetria/)).toBeVisible()

    // El resumen no viaja en el listado: pedirlo de entrada anularia el ahorro.
    expect(getWork).not.toHaveBeenCalled()
  })

  it('al desplegarlo pide la ficha y muestra el resumen', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /abstract/i }))

    await expect
      .element(screen.getByText('Este trabajo estudia los costes de busqueda.'))
      .toBeVisible()
    expect(getWork).toHaveBeenCalledWith('carbono')
  })

  it('desplegado aparecen los enlaces que no caben en el listado', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /abstract/i }))

    await expect.element(screen.getByText('Datos de replicacion')).toBeVisible()
  })

  it('sin resumen escrito lo dice, en vez de abrir un panel vacio', async () => {
    getWork.mockResolvedValue({ abstractHtml: null, links: [] })
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /abstract/i }))

    await expect
      .element(screen.getByText('This work has no published abstract.'))
      .toBeVisible()
  })

  it('sin PDF publico no se ofrece el boton', async () => {
    const screen = await pintar({ ...TRABAJO, pdfUrl: null })
    await expect.element(screen.getByText(/Asimetria/)).toBeVisible()

    await expect.element(screen.getByText('PDF')).not.toBeInTheDocument()
  })
})
