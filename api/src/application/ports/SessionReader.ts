/**
 * Puerto de lectura de sesion.
 *
 * Aisla a la capa HTTP del proveedor de autenticacion: el middleware no sabe que
 * detras hay Better Auth, y sustituirlo no obliga a tocar rutas ni controladores.
 *
 * Recibe cabeceras como datos planos, no un objeto de Express, para que la capa de
 * aplicacion siga sin conocer el framework.
 */

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
}

export type RequestHeaders = Record<string, string | string[] | undefined>

export interface SessionReader {
  /** Devuelve el usuario de la sesion, o null si no hay sesion valida. */
  getAuthenticatedUser(headers: RequestHeaders): Promise<AuthenticatedUser | null>
}
