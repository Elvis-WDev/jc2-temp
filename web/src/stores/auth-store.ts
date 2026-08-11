import { create } from 'zustand'
import type { SessionUser } from '@/lib/api/auth'

/**
 * Estado de sesion en memoria.
 *
 * NO guarda ningun token ni cookie. La sesion vive en una cookie `HttpOnly` que el
 * JavaScript no puede leer (ADR-0001, SEC-002); el navegador la envia sola. Esto es
 * solo una copia del usuario para pintarlo en la interfaz.
 *
 * La fuente de verdad de "hay sesion" es la consulta a la API, no este store: si aqui
 * hubiera un usuario y la cookie hubiera caducado, la primera peticion devolveria 401
 * y el interceptor global se encargaria.
 */
interface AuthState {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  setUser: (user) => {
    set({ user })
  },
  reset: () => {
    set({ user: null })
  },
}))
