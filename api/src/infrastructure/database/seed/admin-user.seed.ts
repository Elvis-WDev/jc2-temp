import { env } from '../../../config/env.js'
import { auth } from '../../auth/better-auth/auth.js'

/**
 * Crea el unico administrador a partir de las credenciales del entorno.
 *
 * Idempotente: si el email ya existe no hace nada, de modo que puede ejecutarse en
 * cada despliegue sin efectos secundarios.
 *
 * El hash lo produce Better Auth (ADR-0001). Este archivo no implementa criptografia
 * ni escribe directamente en las tablas de autenticacion.
 */
export async function seedAdminUser(): Promise<'created' | 'already-exists'> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_NAME) {
    throw new Error(
      'Faltan ADMIN_EMAIL, ADMIN_PASSWORD o ADMIN_NAME. Definelas antes de sembrar el administrador. Ver .env.example.',
    )
  }

  const email = ADMIN_EMAIL.toLowerCase()
  const ctx = await auth.$context

  const existing = await ctx.internalAdapter.findUserByEmail(email)
  if (existing) return 'already-exists'

  const user = await ctx.internalAdapter.createUser({
    email,
    name: ADMIN_NAME,
    // No hay flujo de verificacion por correo: es una cuenta interna creada por el
    // operador, no un registro publico.
    emailVerified: true,
    role: 'admin',
    isActive: true,
  })

  await ctx.internalAdapter.createAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(ADMIN_PASSWORD),
  })

  return 'created'
}
