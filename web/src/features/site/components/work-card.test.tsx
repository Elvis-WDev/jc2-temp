import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
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
  type: {
    code: 'journal_article',
    label: 'Articulo',
    pluralLabel: 'Articulos',
  },
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
  abstractExcerpt: 'Este trabajo estudia los costes de busqueda.',
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
  it('muestra ano, estado y la referencia de la revista', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('2024')).toBeVisible()
    await expect.element(screen.getByText('Publicado')).toBeVisible()
    await expect
      .element(
        screen.getByText('The Quarterly Journal of Economics, Vol. 139 (2)')
      )
      .toBeVisible()
  })

  it('no repite el tipo de publicacion', async () => {
    // El listado va agrupado por tipo y la banda de encima ya lo dice: repetirlo en
    // cada tarjeta es ruido entre el lector y el titulo.
    const screen = await pintar()
    await expect.element(screen.getByText('2024')).toBeVisible()

    await expect.element(screen.getByText('Articulo')).not.toBeInTheDocument()
  })

  it('descuenta al titular de los coautores', async () => {
    const screen = await pintar()
    await expect.element(screen.getByText('with Ana Soto')).toBeVisible()
  })

  it('el abstract se ensena fijo, sin nada que pulsar', async () => {
    const screen = await pintar()

    await expect
      .element(screen.getByText('Este trabajo estudia los costes de busqueda.'))
      .toBeVisible()
    await expect
      .element(screen.getByRole('button', { name: /abstract/i }))
      .not.toBeInTheDocument()
  })

  it('no pide la ficha de cada publicacion', async () => {
    // El extracto viaja ya recortado en el listado: pedirla por tarjeta seria una
    // peticion por publicacion en cada pagina.
    const screen = await pintar()
    await expect.element(screen.getByText(/Asimetria/)).toBeVisible()

    expect(getWork).not.toHaveBeenCalled()
  })

  it('sin abstract publicado no deja un hueco ni un aviso', async () => {
    const screen = await pintar({ ...TRABAJO, abstractExcerpt: null })
    await expect.element(screen.getByText(/Asimetria/)).toBeVisible()

    await expect
      .element(screen.getByText('This work has no published abstract.'))
      .not.toBeInTheDocument()
  })

  it('lleva a la ficha, que es donde se lee entero', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Full page')).toBeVisible()
  })

  it('el PDF se descarga, no se abre en una pestana', async () => {
    // El servidor sirve el PDF para verse en el navegador, asi que sin `download` se
    // abriria en lugar de guardarse.
    const screen = await pintar()

    const boton = screen.getByRole('link', {
      name: /download the pdf of asimetria/i,
    })
    await expect.element(boton).toBeVisible()
    await expect.element(boton).toHaveAttribute('download')
    await expect.element(boton).toHaveAttribute('href', '/api/public/media/abc')
  })

  it('el boton dice de que publicacion es', async () => {
    // «Descargar PDF» repetido dieciseis veces en un listado no dice cual es cual.
    const screen = await pintar()

    await expect
      .element(screen.getByRole('link', { name: /download the pdf of/i }))
      .toBeVisible()
  })

  it('sin PDF publico no se ofrece el boton', async () => {
    // Mejor ninguno que uno que lleve a un 404.
    const screen = await pintar({ ...TRABAJO, pdfUrl: null })
    await expect.element(screen.getByText(/Asimetria/)).toBeVisible()

    await expect.element(screen.getByText('PDF')).not.toBeInTheDocument()
  })
})
