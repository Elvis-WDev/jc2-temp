import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { type Department } from '@/features/institutions/api'
import { DepartmentFormDialog } from './department-form-dialog'

const createDepartment = vi.fn()
const updateDepartment = vi.fn()

vi.mock('@/features/institutions/api', () => ({
  createDepartment: (input: unknown) => createDepartment(input),
  updateDepartment: (id: string, input: unknown) => updateDepartment(id, input),
  listInstitutions: () =>
    Promise.resolve({
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Universidad A',
          isActive: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Universidad B',
          isActive: false,
        },
      ],
      meta: {
        pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
      },
    }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const DEPARTAMENTO: Department = {
  id: '33333333-3333-4333-8333-333333333333',
  institutionId: '11111111-1111-4111-8111-111111111111',
  institutionName: 'Universidad A',
  name: 'Escuela de Economia',
  shortName: 'EdE',
  slug: 'escuela-economia',
  websiteUrl: null,
  descriptionMarkdown: null,
  sortOrder: 0,
  isActive: true,
}

async function abrir(
  props: Partial<Parameters<typeof DepartmentFormDialog>[0]> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <DepartmentFormDialog open onOpenChange={vi.fn()} {...props} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  createDepartment.mockResolvedValue(DEPARTAMENTO)
  updateDepartment.mockResolvedValue(DEPARTAMENTO)
})

describe('al crear', () => {
  it('sugiere el identificador a partir del nombre', async () => {
    const { getByLabelText } = await abrir()

    await userEvent.fill(getByLabelText('Name'), 'Escuela de Economia')

    await expect
      .element(getByLabelText('Identifier'))
      .toHaveValue('escuela-de-economia')
  })

  it('deja de sugerirlo en cuanto se escribe uno a mano', async () => {
    const { getByLabelText } = await abrir()

    await userEvent.fill(getByLabelText('Identifier'), 'mi-slug')
    await userEvent.fill(getByLabelText('Name'), 'Otro nombre distinto')

    await expect.element(getByLabelText('Identifier')).toHaveValue('mi-slug')
  })
})

describe('al editar', () => {
  /**
   * La clave foránea compuesta es ON UPDATE CASCADE: mover el departamento movería con
   * él la institución de cada afiliación. La API lo rechaza con 409; aquí ni siquiera
   * se ofrece, para no llevar a un callejón sin salida.
   */
  it('no deja cambiar de institucion, y explica por que', async () => {
    const { getByLabelText, getByText } = await abrir({
      department: DEPARTAMENTO,
    })

    await expect.element(getByLabelText('Institution')).toBeDisabled()
    await expect.element(getByText(/would move with it/)).toBeInTheDocument()
  })

  it('el identificador llega relleno y se puede cambiar el resto', async () => {
    const { getByLabelText, getByRole } = await abrir({
      department: DEPARTAMENTO,
    })

    await expect
      .element(getByLabelText('Identifier'))
      .toHaveValue('escuela-economia')

    await userEvent.fill(getByLabelText('Acronym'), 'EEF')
    await userEvent.click(getByRole('button', { name: 'Save' }))

    expect(updateDepartment).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      expect.objectContaining({ shortName: 'EEF', name: 'Escuela de Economia' })
    )
  })
})
