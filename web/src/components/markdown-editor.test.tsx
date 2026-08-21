import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { MarkdownEditor } from './markdown-editor'

/**
 * Lo que se comprueba aqui es lo unico que puede estropear texto ya escrito: que los
 * botones toquen **solo** lo seleccionado y devuelvan Markdown corriente.
 *
 * La vista previa no se prueba en este fichero: la calcula el servidor, y de que lo haga
 * por el mismo camino que el contenido publicado se encarga `markdown.routes.test.ts`.
 */

// Solo `post`: el resto del cliente lo usan otros modulos que cuelgan de aqui, y
// sustituirlo entero los dejaba sin `del` ni `getWithMeta`.
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  post: () => Promise.resolve({ html: '<p>lo que sea</p>' }),
}))

function Campo({ inicial }: { inicial: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MarkdownEditor value={valor} onChange={setValor} />
      {/* Para poder leer lo que hay guardado sin depender del textarea. */}
      <output>{valor}</output>
    </QueryClientProvider>
  )
}

/** Escribe en el campo y deja seleccionado el trozo que va de `desde` a `hasta`. */
async function seleccionar(
  campo: HTMLTextAreaElement,
  desde: number,
  hasta: number
) {
  campo.focus()
  campo.setSelectionRange(desde, hasta)
}

describe('los botones del editor', () => {
  it('ponen la negrita alrededor de lo seleccionado y no de mas', async () => {
    const { getByRole, container } = await render(
      <Campo inicial='uno dos tres' />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    await seleccionar(campo, 4, 7)
    await userEvent.click(getByRole('button', { name: 'Bold' }))

    await expect
      .element(container.querySelector('output') as HTMLElement)
      .toHaveTextContent('uno **dos** tres')
  })

  it('vuelven a quitarla si ya estaba puesta', async () => {
    const { getByRole, container } = await render(
      <Campo inicial='uno **dos** tres' />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    // La seleccion es «dos», entre las marcas.
    await seleccionar(campo, 6, 9)
    await userEvent.click(getByRole('button', { name: 'Bold' }))

    await expect
      .element(container.querySelector('output') as HTMLElement)
      .toHaveTextContent('uno dos tres')
  })

  it('el titulo se antepone a la linea entera, no al trozo suelto', async () => {
    const { getByRole, container } = await render(
      <Campo inicial={'Primera linea\nSegunda linea'} />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    // El cursor cae en medio de la segunda linea.
    await seleccionar(campo, 20, 20)
    await userEvent.click(getByRole('button', { name: 'Heading' }))

    expect(campo.value).toBe('Primera linea\n## Segunda linea')
  })

  it('la lista marca todas las lineas de la seleccion', async () => {
    const { getByRole, container } = await render(
      <Campo inicial={'uno\ndos\ntres'} />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    // A media palabra en la primera y en la ultima: el prefijo va a la linea entera,
    // no donde cayo el raton. Empezando en 0 esta prueba no distinguia una cosa de la
    // otra y pasaba igual con el codigo roto.
    await seleccionar(campo, 1, 10)
    await userEvent.click(getByRole('button', { name: 'Bulleted list' }))

    expect(campo.value).toBe('- uno\n- dos\n- tres')
  })

  it('y el mismo boton las desmarca', async () => {
    const { getByRole, container } = await render(
      <Campo inicial={'- uno\n- dos'} />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    await seleccionar(campo, 3, 9)
    await userEvent.click(getByRole('button', { name: 'Bulleted list' }))

    expect(campo.value).toBe('uno\ndos')
  })

  it('el enlace conserva el texto y deja donde escribir la direccion', async () => {
    const { getByRole, container } = await render(
      <Campo inicial='ver el paper' />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    await seleccionar(campo, 7, 12)
    await userEvent.click(getByRole('button', { name: 'Link' }))

    expect(campo.value).toBe('ver el [paper](https://)')
  })

  it('sin seleccion, la negrita deja el cursor entre las marcas', async () => {
    const { getByRole, container } = await render(<Campo inicial='hola ' />)
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    await seleccionar(campo, 5, 5)
    await userEvent.click(getByRole('button', { name: 'Bold' }))

    expect(campo.value).toBe('hola ****')
    expect(campo.selectionStart).toBe(7)
    expect(campo.selectionEnd).toBe(7)
  })

  it('la cita no se come el resto del texto', async () => {
    const { getByRole, container } = await render(
      <Campo inicial={'Antes\nCitado\nDespues'} />
    )
    const campo = container.querySelector('textarea') as HTMLTextAreaElement

    await seleccionar(campo, 8, 10)
    await userEvent.click(getByRole('button', { name: 'Quote' }))

    expect(campo.value).toBe('Antes\n> Citado\nDespues')
  })
})

describe('la vista previa', () => {
  it('esconde el textarea y desactiva los botones de escribir', async () => {
    const { getByRole, container } = await render(<Campo inicial='hola' />)

    await userEvent.click(getByRole('button', { name: 'Preview' }))

    expect(container.querySelector('textarea')).toBeNull()
    await expect.element(getByRole('button', { name: 'Bold' })).toBeDisabled()
  })

  it('vuelve al texto tal cual estaba', async () => {
    const { getByRole, container } = await render(<Campo inicial='hola' />)

    await userEvent.click(getByRole('button', { name: 'Preview' }))
    await userEvent.click(getByRole('button', { name: 'Write' }))

    expect(
      (container.querySelector('textarea') as HTMLTextAreaElement).value
    ).toBe('hola')
  })
})
