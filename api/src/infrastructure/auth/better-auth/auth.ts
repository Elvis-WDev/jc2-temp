import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { env, isProduction } from '../../../config/env.js'
import { prisma } from '../../database/prisma/client.js'

/**
 * Better Auth: unico dueno de usuarios, sesiones, cookies y hashing (ADR-0001).
 *
 * Solo email + contrasena. Sin OTP, sin 2FA, sin magic link, sin OAuth y sin
 * registro publico: el unico administrador lo crea el seeder desde .env.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/admin/auth',

  // Sin comodines: solo los origenes declarados explicitamente (SEC-007).
  trustedOrigins: env.CORS_ORIGIN,

  emailAndPassword: {
    enabled: true,
    // ERS §38 y authentication.md:19: el registro publico esta deshabilitado.
    // El unico administrador nace del seeder.
    disableSignUp: true,
    minPasswordLength: 12,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    // Renueva la sesion cuando se usa. Esto es lo que hace innecesario un endpoint
    // de refresh (ADR-0003).
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    },
  },

  user: {
    // Campos que el ERS §7 tenia en su tabla `users` y que aqui viven en el modelo
    // de Better Auth (ADR-0001).
    additionalFields: {
      role: { type: 'string', defaultValue: 'admin', input: false },
      isActive: { type: 'boolean', defaultValue: true, input: false },
      lastLoginAt: { type: 'date', required: false, input: false },
    },
  },
})

export type Auth = typeof auth
