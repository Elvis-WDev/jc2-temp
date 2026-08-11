import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Entorno minimo para que config/env.ts valide sin depender de un .env local.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: 'test-secret-con-mas-de-treinta-y-dos-caracteres',
      BETTER_AUTH_URL: 'http://localhost:4000',
      CORS_ORIGIN: 'http://localhost:3000',
      PUBLIC_BASE_URL: 'http://localhost:4000',
    },
  },
})
