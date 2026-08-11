import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth-store'

const USUARIO = {
  id: 'user-1',
  email: 'admin@jc2.local',
  name: 'Site Administrator',
  role: 'admin',
  isActive: true,
}

beforeEach(() => {
  useAuthStore.getState().reset()
})

describe('auth store', () => {
  it('arranca sin usuario', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('guarda el usuario de la sesion', () => {
    useAuthStore.getState().setUser(USUARIO)
    expect(useAuthStore.getState().user).toEqual(USUARIO)
  })

  it('reset lo limpia', () => {
    useAuthStore.getState().setUser(USUARIO)
    useAuthStore.getState().reset()
    expect(useAuthStore.getState().user).toBeNull()
  })
})

// ADR-0001 y SEC-002: la sesion vive en una cookie HttpOnly que el JavaScript no puede
// leer. Estos tests fallarian si alguien reintrodujera un token accesible desde el
// cliente, que es como estaba la plantilla originalmente.
describe('no se persiste ninguna credencial en el cliente', () => {
  it('el store no expone ningun token', () => {
    useAuthStore.getState().setUser(USUARIO)
    const estado = useAuthStore.getState() as unknown as Record<string, unknown>

    expect(Object.keys(estado)).toEqual(['user', 'setUser', 'reset'])
    expect(estado.accessToken).toBeUndefined()
  })

  it('no escribe nada en localStorage ni en las cookies del documento', () => {
    // Se compara antes contra despues en lugar de exigir un localStorage vacio: el
    // propio banco de pruebas guarda ahi sus preferencias (`vitest-ui_*`) y compartimos
    // origen con el. Lo que importa no es que el almacen este vacio, sino que guardar
    // un usuario no anada ni cambie nada.
    const clavesAntes = JSON.stringify(Object.entries(localStorage).sort())
    const cookiesAntes = document.cookie

    useAuthStore.getState().setUser(USUARIO)

    expect(JSON.stringify(Object.entries(localStorage).sort())).toBe(
      clavesAntes
    )
    expect(document.cookie).toBe(cookiesAntes)
  })
})
