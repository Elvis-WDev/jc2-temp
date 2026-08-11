import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const navigate = vi.fn()
const reset = vi.fn()
const clear = vi.fn()
const signOut = vi.fn().mockResolvedValue(undefined)

const MOCK_HREF = 'https://app.test/works?page=2'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { reset: () => void }) => unknown) =>
    selector({ reset }),
}))

vi.mock('@/lib/api/auth', () => ({
  signOut: () => signOut(),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return { ...actual, useQueryClient: () => ({ clear }) }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useLocation: () => ({ href: MOCK_HREF }),
  }
})

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cierra la sesion en el servidor, limpia el estado local y vuelve al login', async () => {
    const { getByRole } = await render(
      <SignOutDialog open onOpenChange={vi.fn()} />
    )

    await userEvent.click(getByRole('button', { name: /^Sign out$/i }))

    // La invalidacion real es del servidor; sin esta llamada la cookie seguiria viva.
    expect(signOut).toHaveBeenCalledOnce()
    expect(reset).toHaveBeenCalledOnce()
    // Sin limpiar la cache, otra pantalla podria seguir pintando datos de la sesion
    // que se acaba de cerrar.
    expect(clear).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: MOCK_HREF },
      replace: true,
    })
  })
})
