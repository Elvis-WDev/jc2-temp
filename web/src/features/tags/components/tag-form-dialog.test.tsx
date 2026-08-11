import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ApiError } from '@/lib/api/api-error'
import { TagFormDialog } from './tag-form-dialog'

const createTag = vi.fn()
const updateTag = vi.fn()

vi.mock('../api', () => ({
  createTag: (input: unknown) => createTag(input),
  updateTag: (id: string, input: unknown) => updateTag(id, input),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

async function renderDialog(
  props: Partial<Parameters<typeof TagFormDialog>[0]> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TagFormDialog open onOpenChange={vi.fn()} {...props} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  createTag.mockResolvedValue({
    id: 't1',
    name: 'Behavioral Economics',
    slug: 'behavioral-economics',
    category: null,
    sortOrder: 0,
    isActive: true,
  })
})

describe('alta de etiqueta', () => {
  it('envia el nombre y no envia slug: lo deriva el servidor', async () => {
    const screen = await renderDialog()

    await userEvent.fill(screen.getByLabelText(/name/i), 'Behavioral Economics')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await vi.waitFor(() => {
      expect(createTag).toHaveBeenCalledWith({
        name: 'Behavioral Economics',
        category: null,
      })
    })
    // Aceptar un slug del cliente permitiria dos etiquetas con el mismo nombre y
    // slugs distintos, que es lo que RF-007 evita.
    expect(createTag.mock.calls[0]?.[0]).not.toHaveProperty('slug')
  })

  it('no envia nada si falta el nombre', async () => {
    const screen = await renderDialog()

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(createTag).not.toHaveBeenCalled()
  })
})

// RF-007: el caso que da sentido a todo el modulo.
describe('etiqueta duplicada', () => {
  it('el 409 se muestra junto al campo del nombre, no en un toast', async () => {
    createTag.mockRejectedValue(
      new ApiError({
        code: 'TAG_ALREADY_EXISTS',
        message: 'A tag with this name already exists: "Behavioral Economics".',
        status: 409,
        requestId: 'req-1',
        fields: {
          name: 'This tag already exists.',
          existingTagId: 'tag-existente',
        },
      })
    )

    const screen = await renderDialog()

    await userEvent.fill(screen.getByLabelText(/name/i), 'behavioral economics')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    // El mensaje nombra la etiqueta que ya existe, para poder reutilizarla en lugar
    // de dejar al usuario atascado.
    await expect
      .element(screen.getByText(/already exists: "Behavioral Economics"/i))
      .toBeInTheDocument()
  })
})

describe('edicion', () => {
  const ETIQUETA = {
    id: 't1',
    name: 'Auctions',
    slug: 'auctions',
    category: 'topic',
    sortOrder: 0,
    isActive: true,
  }

  it('muestra como aparece en la web y avisa de que no cambia al renombrar', async () => {
    const screen = await renderDialog({ tag: ETIQUETA })

    await expect.element(screen.getByText('auctions')).toBeInTheDocument()
    await expect
      .element(screen.getByText(/does not change even if you rename/i))
      .toBeInTheDocument()
  })
})
