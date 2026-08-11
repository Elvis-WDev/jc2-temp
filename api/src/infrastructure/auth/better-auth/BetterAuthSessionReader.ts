import { fromNodeHeaders } from 'better-auth/node'
import type {
  AuthenticatedUser,
  RequestHeaders,
  SessionReader,
} from '../../../application/ports/SessionReader.js'
import type { Auth } from './auth.js'

/**
 * Implementacion del puerto SessionReader sobre Better Auth.
 *
 * Es el unico punto del sistema que traduce una sesion de Better Auth al tipo de
 * usuario que maneja la aplicacion.
 */
export class BetterAuthSessionReader implements SessionReader {
  constructor(private readonly auth: Auth) {}

  async getAuthenticatedUser(headers: RequestHeaders): Promise<AuthenticatedUser | null> {
    const session = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
    })

    if (!session?.user) return null

    const user = session.user as typeof session.user & { role?: string; isActive?: boolean }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role ?? 'admin',
      isActive: user.isActive ?? true,
    }
  }
}
