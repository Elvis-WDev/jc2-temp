import { z } from 'zod'

/**
 * Validacion del entorno. El proceso no arranca si falta o es invalida una variable
 * requerida: preferimos fallar en el arranque a fallar en la primera peticion.
 *
 * Las credenciales del administrador son opcionales aqui porque solo las necesita el
 * seeder; este las exige por su cuenta con su propio mensaje.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  DATABASE_URL: z.string().min(1, 'requerida'),

  BETTER_AUTH_SECRET: z.string().min(32, 'debe tener al menos 32 caracteres'),
  BETTER_AUTH_URL: z.url(),

  // Lista separada por comas. Sin comodines: cada origen se declara explicitamente.
  CORS_ORIGIN: z
    .string()
    .min(1, 'requerida')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),

  PUBLIC_BASE_URL: z.url(),

  STORAGE_ROOT: z.string().min(1).default('./storage'),
  // Cota global. El limite fino es por proposito (ver UploadPolicy); este solo evita
  // que multer escriba en disco algo que ningun proposito podria aceptar.
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  /**
   * Limite del contenido publico, aparte del administrativo.
   *
   * Una sola visita a una ficha con galeria puede pedir quince archivos, y una oficina
   * entera comparte una IP. Con el limite del panel, los visitantes se quedaban sin
   * imagenes; con este, un lector normal no se acerca.
   */
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),

  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NAME: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Cuantos caracteres llegaron, para las variables cuyo valor no se puede ensenar.
 *
 * Sin esto, "expected string to have >=12 characters" no distingue entre una
 * contrasena corta y una que el orquestador trunco por el camino: un `$` sin escapar en
 * un fichero de entorno se lee como una variable, y `Contrasena$Segura2026` llega como
 * `Contrasena`. El numero lo delata de un vistazo, y el valor sigue sin salir al log.
 */
function longitudRecibida(source: NodeJS.ProcessEnv, nombre: string): string {
  const secretas = ['ADMIN_PASSWORD', 'BETTER_AUTH_SECRET']
  if (!secretas.includes(nombre)) return ''

  const valor = source[nombre]
  if (valor === undefined) return ''
  return ` (llegaron ${String(valor.length)} caracteres)`
}

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    const detalle = result.error.issues
      .map((issue) => {
        const nombre = issue.path.join('.') || '(raiz)'
        return `  - ${nombre}: ${issue.message}${longitudRecibida(source, nombre)}`
      })
      .join('\n')

    // El mensaje nombra la variable, nunca su valor: no filtramos secretos al log.
    throw new Error(`Configuracion de entorno invalida:\n${detalle}\n\nRevisa .env.example.`)
  }

  return result.data
}

export const env = parseEnv(process.env)

export const isProduction = env.NODE_ENV === 'production'
export const isTest = env.NODE_ENV === 'test'
