/// <reference types="vitest/config" />
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

// https://vite.dev/config/
export default defineConfig({
  // El .env vive en la raiz del proyecto, compartido con la API. Vite solo expone al
  // navegador las variables con prefijo VITE_, asi que los secretos del backend que
  // hay en ese archivo NO acaban en el bundle.
  envDir: '..',

  // Un solo origen, igual que en produccion: nginx sirve el sitio y pasa `/api` a la
  // API, y aqui hace lo mismo el servidor de Vite. Asi la cookie de sesion es de
  // primera parte y, sobre todo, las imagenes de `/api/public/media` se pueden
  // pintar; sirviendolas desde otro origen el navegador las descarga y las descarta.
  //
  // `changeOrigin` reescribe el Host a la API, que es lo que espera BETTER_AUTH_URL.
  // La cabecera `Origin` se reenvia tal cual, y sigue siendo la que CORS_ORIGIN y
  // `trustedOrigins` declaran (SEC-007): no se relaja nada.
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.DEV_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
      // Los rastreadores los buscan en la raiz, no bajo /api. Los genera la API a
      // partir de lo publicado, asi que aqui solo se redirige (ERS §39).
      '^/(sitemap\\.xml|robots\\.txt)$': {
        target: process.env.DEV_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (ruta) => `/api/public${ruta}`,
      },
    },
  },
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    silent: 'passed-only',
    unstubEnvs: true,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    coverage: {
      // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
      exclude: [
        'src/components/ui/**',
        'src/assets/**',
        'src/tanstack-table.d.ts',
        'src/routeTree.gen.ts',
        'src/test-utils/**',
        'src/routes/**',
      ],
    },
  },
})
