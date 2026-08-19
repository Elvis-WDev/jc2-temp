import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { AppDataTable } from '@/components/data-table'
import { type Work } from '../api'
import { worksColumns } from './works-columns'

const ACCIONES = {
  onEdit: vi.fn(),
  onPublish: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
}

function trabajo(parcial: Partial<Work> = {}): Work {
  return {
    id: 'w1',
    workTypeId: 'wt1',
    workTypeCode: 'journal_article',
    workTypeLabel: 'Journal Article',
    title: 'Revenue Equivalence in Dynamic Auctions',
    subtitle: null,
    slug: 'revenue-equivalence',
    abstractMarkdown: null,
    descriptionMarkdown: null,
    academicStatus: 'published',
    academicStatusLabel: 'Publicado',
    academicStatusTone: 'success',
    editorialStatus: 'draft',
    publicationDate: null,
    publicationYear: 2024,
    firstOnlineDate: null,
    venueId: null,
    venueName: 'Journal of Economic Theory',
    venueAbbreviation: null,
    venueRanking: null,
    publisherName: null,
    volume: null,
    issue: null,
    pages: null,
    articleNumber: null,
    doi: null,
    isbn: null,
    issn: null,
    languageCode: null,
    coverMediaId: null,
    citationTextOverride: null,
    versionLabel: null,
    downloadCode: null,
    bibtexOverride: null,
    isFeatured: false,
    isCarousel: false,
    carouselOrder: null,
    featuredOrder: null,
    displayOrder: null,
    isOpenAccess: false,
    publishedAt: null,
    archivedAt: null,
    authors: [],
    tags: [],
    links: [],
    files: [],
    ...parcial,
  }
}

const AUTOR = {
  personId: 'p1',
  fullName: 'Juan Carlos Carbajal',
  givenName: 'Juan Carlos',
  familyName: 'Carbajal',
  authorOrder: 1,
  contributionRole: null,
  isCorresponding: true,
}

function renderTabla(work: Work) {
  return render(
    <AppDataTable
      data={[work]}
      columns={worksColumns(ACCIONES)}
      search={{}}
      navigate={vi.fn()}
      server={{ rowCount: 1 }}
    />
  )
}

/**
 * RN-002 y RN-003 en la interfaz.
 *
 * El backend ya rechaza estas operaciones con 422. Lo que se comprueba aqui es que el
 * panel no deja al usuario intentarlo para recibir un error: deshabilita la accion y
 * explica por que.
 */
describe('acciones de ciclo de vida', () => {
  it('un trabajo sin autores no se puede publicar (RN-002)', async () => {
    const screen = await renderTabla(trabajo({ authors: [] }))

    const publicar = screen.getByRole('button', { name: /publish/i })
    await expect.element(publicar).toBeDisabled()
  })

  it('con al menos un autor, publicar se habilita', async () => {
    const screen = await renderTabla(trabajo({ authors: [AUTOR] }))

    await expect
      .element(screen.getByRole('button', { name: /publish/i }))
      .toBeEnabled()
  })

  it('lo ya publicado no ofrece volver a publicarse', async () => {
    const screen = await renderTabla(
      trabajo({ editorialStatus: 'published', authors: [AUTOR] })
    )

    await expect
      .element(screen.getByRole('button', { name: /publish/i }))
      .toBeDisabled()
  })

  it('lo ya archivado no ofrece volver a archivarse', async () => {
    const screen = await renderTabla(
      trabajo({ editorialStatus: 'archived', authors: [AUTOR] })
    )

    await expect
      .element(screen.getByRole('button', { name: /archive/i }))
      .toBeDisabled()
  })
})

describe('identidad del trabajo en la tabla', () => {
  it('muestra titulo, autores y venue, no identificadores internos', async () => {
    const screen = await renderTabla(trabajo({ authors: [AUTOR] }))

    await expect
      .element(screen.getByText('Revenue Equivalence in Dynamic Auctions'))
      .toBeInTheDocument()
    await expect
      .element(
        screen.getByText(/Juan Carlos Carbajal.*Journal of Economic Theory/)
      )
      .toBeInTheDocument()
  })

  it('dice "Sin autores" en lugar de dejar el hueco vacio', async () => {
    const screen = await renderTabla(trabajo({ authors: [] }))

    await expect.element(screen.getByText(/no authors/i)).toBeInTheDocument()
  })
})
