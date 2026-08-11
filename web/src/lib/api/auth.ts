import { api } from './client'

/**
 * Autenticacion contra Better Auth (ADR-0001).
 *
 * Better Auth NO usa el envelope `{ data }` del resto de la API: responde su propia
 * forma, asi que estas llamadas usan `api` directamente en lugar de los ayudantes que
 * desempaquetan.
 *
 * No se guarda ningun token: la sesion viaja en una cookie `HttpOnly` que el navegador
 * envia sola gracias a `withCredentials`.
 */

export interface SessionUser {
  id: string
  email: string
  name: string
  role?: string
  isActive?: boolean
}

interface SessionResponse {
  user: SessionUser | null
}

/** Devuelve el usuario de la sesion, o null si no hay ninguna. */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const response = await api.get<SessionResponse | null>(
      '/api/admin/auth/get-session'
    )
    return response.data?.user ?? null
  } catch {
    // Sin sesion, Better Auth responde 401: no es un fallo que deba propagarse, es la
    // respuesta legitima a "¿hay alguien conectado?".
    return null
  }
}

export async function signIn(credentials: {
  email: string
  password: string
}): Promise<void> {
  await api.post('/api/admin/auth/sign-in/email', credentials)
}

export async function signOut(): Promise<void> {
  await api.post('/api/admin/auth/sign-out', {})
}
