import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ApiError } from '@/lib/api/api-error'
import { UserAuthForm } from './user-auth-form'

const navigate = vi.fn()
const setUser = vi.fn()
const signIn = vi.fn()
const getSession = vi.fn()

const USUARIO = {
  id: 'u1',
  email: 'admin@jc2.local',
  name: 'Admin',
  role: 'admin',
}

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { setUser: () => void }) => unknown) =>
    selector({ setUser }),
}))

vi.mock('@/lib/api/auth', () => ({
  signIn: (credenciales: unknown) => signIn(credenciales),
  getSession: () => getSession(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

function renderForm(redirectTo?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <UserAuthForm redirectTo={redirectTo} />
    </QueryClientProvider>
  )
}

async function rellenarYEnviar(
  screen: Awaited<ReturnType<typeof renderForm>>,
  email = 'admin@jc2.local',
  password = 'contrasena-larga'
) {
  await userEvent.fill(screen.getByLabelText(/email/i), email)
  await userEvent.fill(screen.getByLabelText(/password/i), password)
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn.mockResolvedValue(undefined)
    getSession.mockResolvedValue(USUARIO)
  })

  it('inicia sesion contra la API y redirige al destino guardado', async () => {
    const screen = await renderForm('/admin/works')
    await rellenarYEnviar(screen)

    await vi.waitFor(() => {
      expect(signIn).toHaveBeenCalledWith({
        email: 'admin@jc2.local',
        password: 'contrasena-larga',
      })
    })

    // Se relee la sesion en lugar de fiarse del cuerpo del login: asi el usuario
    // guardado es el que el backend considera autenticado.
    await vi.waitFor(() => {
      expect(getSession).toHaveBeenCalledOnce()
      expect(setUser).toHaveBeenCalledWith(USUARIO)
      expect(navigate).toHaveBeenCalledWith({
        to: '/admin/works',
        replace: true,
      })
    })
  })

  it('sin destino guardado va al panel, no a la raiz publica', async () => {
    const screen = await renderForm()
    await rellenarYEnviar(screen)

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/admin', replace: true })
    })
  })

  it('unas credenciales invalidas muestran un mensaje y no redirigen', async () => {
    signIn.mockRejectedValue(
      new ApiError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
        status: 401,
        requestId: 'req-1',
      })
    )

    const screen = await renderForm()
    await rellenarYEnviar(screen)

    // No se distingue email inexistente de contrasena incorrecta: eso permitiria
    // enumerar cuentas.
    await expect
      .element(screen.getByText(/incorrect email or password/i))
      .toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('el limite de intentos se explica en lugar de decir "error"', async () => {
    signIn.mockRejectedValue(
      new ApiError({
        code: 'LOGIN_RATE_LIMITED',
        message: 'Too many requests',
        status: 429,
        requestId: 'req-2',
      })
    )

    const screen = await renderForm()
    await rellenarYEnviar(screen)

    await expect
      .element(screen.getByText(/too many attempts/i))
      .toBeInTheDocument()
  })

  it('un destino que apunta al propio acceso se descarta', async () => {
    // Pasa al escribir `/admin/sign-in`: el guard rebota a `/sign-in` guardando esa
    // direccion, y al volver ya identificado no hay ninguna ruta ahi.
    const screen = await renderForm('/admin/sign-in')
    await rellenarYEnviar(screen)

    await vi.waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/admin', replace: true })
    })
  })

  it('no envia nada si el email es invalido', async () => {
    const screen = await renderForm()
    await rellenarYEnviar(screen, 'no-es-un-email')

    expect(signIn).not.toHaveBeenCalled()
  })
})
