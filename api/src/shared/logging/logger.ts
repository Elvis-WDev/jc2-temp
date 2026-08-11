import { pino } from 'pino'
import { env, isTest } from '../../config/env.js'

/**
 * Logs estructurados (ERS §42, observability.md).
 *
 * La redaccion es obligatoria: no se registran passwords, tokens, cookies ni
 * cadenas de conexion. `DATABASE_URL` entra porque lleva credenciales embebidas.
 */
const RUTAS_REDACTADAS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'newPassword',
  '*.newPassword',
  'token',
  '*.token',
  'secret',
  '*.secret',
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'ADMIN_PASSWORD',
]

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: { paths: RUTAS_REDACTADAS, censor: '[redacted]' },
  base: { env: env.NODE_ENV },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

export type Logger = typeof logger
