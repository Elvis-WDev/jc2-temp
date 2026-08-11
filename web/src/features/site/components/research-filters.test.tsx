import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type ResearchFacets } from '../api'
import { ResearchFilters } from './research-filters'

const FACETS: ResearchFacets = {
  types: [
    { code: 'journal_article', label: 'Articulo', count: 42 },
    { code: 'working_paper', label: 'Documento de trabajo', count: 12 },
  ],
  statuses: [{ value: 'published', label: 'Published', count: 40 }],
  years: [
    { year: 2024, count: 5 },
    { year: 2023, count: 8 },
    { year: 2022, count: 3 },
    { year: 2021, count: 2 },
    { year: 2020, count: 1 },
    { year: 2019, count: 4 },
  ],
  tags: [{ slug: 'mercados', name: 'Mercados', count: 7 }],
}

const onChange = vi.fn()

function pintar(filtros = {}) {
  return render(
    <ResearchFilters facets={FACETS} filtros={filtros} onChange={onChange} />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('filtros de Research', () => {
  it('cada opcion lleva su recuento, sacado de las facetas', async () => {
    const screen = await pintar()

    await expect.element(screen.getByText('Articulo')).toBeVisible()
    await expect.element(screen.getByText('42')).toBeVisible()
  })

  it('elegir un tipo lo comunica por su codigo', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /Articulo/ }))

    expect(onChange).toHaveBeenCalledWith({ type: 'journal_article' })
  })

  it('volver a pulsar el que ya esta elegido lo quita', async () => {
    // Es la salida de la seleccion simple: sin esto no habria forma de volver a "todos".
    const screen = await pintar({ type: 'journal_article' })
    await userEvent.click(screen.getByRole('button', { name: /Articulo/ }))

    expect(onChange).toHaveBeenCalledWith({ type: undefined })
  })

  it('un tema se comunica por su slug', async () => {
    const screen = await pintar()
    await userEvent.click(screen.getByRole('button', { name: /Mercados/ }))

    expect(onChange).toHaveBeenCalledWith({ tag: 'mercados' })
  })

  it('un ano concreto acota por los dos lados', async () => {
    const screen = await pintar()
    await userEvent.selectOptions(
      screen.getByLabelText('Filter by year'),
      '2023'
    )

    expect(onChange).toHaveBeenCalledWith({ year_from: 2023, year_to: 2023 })
  })

  it('"y anteriores" solo pone el limite superior', async () => {
    const screen = await pintar()
    // Con seis anos, los cinco primeros salen sueltos y el resto se agrupa.
    await userEvent.selectOptions(
      screen.getByLabelText('Filter by year'),
      'hasta-2019'
    )

    expect(onChange).toHaveBeenCalledWith({
      year_from: undefined,
      year_to: 2019,
    })
  })

  it('la busqueda se envia al confirmar, no en cada tecla', async () => {
    const screen = await pintar()
    const campo = screen.getByLabelText('Search the publications')

    await userEvent.fill(campo, 'carbono')
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith({ q: 'carbono' })
  })
})
