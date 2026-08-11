import { defineConfig } from 'prisma/config'

/**
 * Configuracion de la CLI de Prisma (migrate, db, studio, generate).
 *
 * Desde Prisma 7 la cadena de conexion sale de schema.prisma y vive aqui. El cliente
 * en tiempo de ejecucion no usa este archivo: recibe un driver adapter (ver
 * src/infrastructure/database/prisma/client.ts).
 */

// Prisma 7 ya no carga .env automaticamente. Node lo hace de forma nativa.
// El archivo vive en la raiz del proyecto, compartido con el panel; si no existe se
// ignora, porque en CI y en produccion las variables vienen del entorno.
try {
  process.loadEnvFile('../.env')
} catch {
  // Sin .env local: se usan las variables ya presentes en el entorno.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: 'prisma/migrations',
    // Los seeds viven bajo src/ para que el typecheck y el linter los cubran.
    seed: 'tsx src/infrastructure/database/seed/index.ts',
  },
})
