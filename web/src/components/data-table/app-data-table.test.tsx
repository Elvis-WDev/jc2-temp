import { type ColumnDef } from '@tanstack/react-table'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { AppDataTable } from './app-data-table'

/**
 * Un filtro que se marca en pantalla pero no llega a la URL es peor que no tenerlo: la
 * tabla sigue mostrando todo mientras la interfaz dice que esta filtrada.
 */

type Fila = { id: string; nombre: string; estado: string }

const FILAS: Fila[] = [
  { id: '1', nombre: 'Uno', estado: 'published' },
  { id: '2', nombre: 'Dos', estado: 'draft' },
]

const COLUMNAS: ColumnDef<Fila>[] = [
  { accessorKey: 'nombre', header: 'Name' },
  { accessorKey: 'estado', header: 'Status' },
]

async function montar(search: Record<string, unknown> = {}) {
  const navigate = vi.fn()
  const pantalla = await render(
    <AppDataTable
      data={FILAS}
      columns={COLUMNAS}
      search={search}
      navigate={navigate}
      urlFilters={[{ columnId: 'estado', searchKey: 'status', type: 'string' }]}
      facetFilters={[
        {
          columnId: 'estado',
          title: 'Status',
          options: [
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' },
          ],
        },
      ]}
      server={{ rowCount: 2, isLoading: false }}
    />
  )
  return { ...pantalla, navigate }
}

/** Lo que el componente pide poner en la URL. */
function ultimaBusqueda(navigate: ReturnType<typeof vi.fn>, previa = {}) {
  const llamadas = navigate.mock.calls
  const llamada = llamadas[llamadas.length - 1]?.[0] as
    | { search: (prev: unknown) => Record<string, unknown> }
    | undefined
  return llamada?.search(previa)
}

describe('filtro de una sola opcion', () => {
  it('lleva la opcion elegida a la URL', async () => {
    const { getByRole, navigate } = await montar()

    await userEvent.click(getByRole('button', { name: /Status/ }))
    await userEvent.click(getByRole('option', { name: 'Published' }))

    expect(ultimaBusqueda(navigate)).toMatchObject({ status: 'published' })
  })

  it('al elegir otra opcion sustituye a la anterior, no la acumula', async () => {
    const { getByRole, navigate } = await montar({ status: 'published' })

    await userEvent.click(getByRole('button', { name: /Status/ }))
    await userEvent.click(getByRole('option', { name: 'Draft' }))

    expect(ultimaBusqueda(navigate)).toMatchObject({ status: 'draft' })
  })

  it('vuelve a pulsar la opcion marcada y se quita el filtro', async () => {
    const { getByRole, navigate } = await montar({ status: 'published' })

    await userEvent.click(getByRole('button', { name: /Status/ }))
    await userEvent.click(getByRole('option', { name: 'Published' }))

    expect(ultimaBusqueda(navigate)?.status).toBeUndefined()
  })

  it('parte de lo que ya venia en la URL', async () => {
    const { getByRole } = await montar({ status: 'published' })

    // El boton muestra la opcion activa: si no, se pierde de vista que hay un filtro
    // puesto y las filas que faltan parecen datos perdidos.
    await expect
      .element(getByRole('button', { name: /Published/ }))
      .toBeInTheDocument()
  })
})
