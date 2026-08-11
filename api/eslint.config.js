import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

/**
 * Reglas de frontera entre capas.
 *
 * La direccion de dependencia es siempre hacia adentro:
 *   domain <- application <- infrastructure / interfaces <- main
 *
 * Sin esto la Clean Architecture es una convencion que se degrada sola. Con esto,
 * romperla falla el `pnpm lint` y por tanto el `pnpm verify`.
 */

const FRAMEWORKS_PROHIBIDOS_EN_DOMINIO = [
  { name: 'express', message: 'El dominio no conoce HTTP.' },
  { name: '@prisma/client', message: 'El dominio no conoce la persistencia.' },
  { name: 'better-auth', message: 'El dominio no conoce el proveedor de autenticacion.' },
  { name: 'multer', message: 'El dominio no conoce la subida de archivos.' },
  { name: 'pino', message: 'El dominio no escribe logs; devuelve errores.' },
  { name: 'axios', message: 'El dominio no hace peticiones HTTP.' },
  { name: 'fs', message: 'El dominio no toca el disco; usa el puerto StorageProvider.' },
  { name: 'node:fs', message: 'El dominio no toca el disco; usa el puerto StorageProvider.' },
  {
    name: 'node:fs/promises',
    message: 'El dominio no toca el disco; usa el puerto StorageProvider.',
  },
  { name: 'path', message: 'El dominio no resuelve rutas del sistema de archivos.' },
  { name: 'node:path', message: 'El dominio no resuelve rutas del sistema de archivos.' },
]

const FRAMEWORKS_PROHIBIDOS_EN_APLICACION = [
  { name: 'express', message: 'Los casos de uso no conocen HTTP.' },
  { name: '@prisma/client', message: 'Los casos de uso dependen de puertos, no de Prisma.' },
  { name: 'better-auth', message: 'Los casos de uso dependen de puertos, no del proveedor.' },
  { name: 'multer', message: 'Los casos de uso reciben streams, no peticiones multipart.' },
  { name: 'fs', message: 'Los casos de uso usan el puerto StorageProvider.' },
  { name: 'node:fs', message: 'Los casos de uso usan el puerto StorageProvider.' },
  { name: 'node:fs/promises', message: 'Los casos de uso usan el puerto StorageProvider.' },
]

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'storage/**',
      'coverage/**',
      'prisma/migrations/**',
      // Codigo generado por Prisma: se regenera, no se edita ni se lintea.
      'src/infrastructure/database/prisma/generated/**',
      // Herramientas que se ejecutan a mano, fuera de tsconfig.json (que solo cubre
      // src/). `pnpm typecheck` si las comprueba.
      'scripts/**',
    ],
  },

  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Los archivos de configuracion de la raiz quedan fuera de tsconfig.json,
          // que solo cubre src/. Sin esto el parser no sabe a que proyecto asignarlos.
          allowDefaultProject: ['*.config.ts', '*.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
    },
  },

  // --- domain: la capa mas interna. No depende de nada. ---
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FRAMEWORKS_PROHIBIDOS_EN_DOMINIO,
          patterns: [
            {
              group: [
                '**/application/**',
                '**/infrastructure/**',
                '**/interfaces/**',
                '**/main/**',
                '**/config/**',
              ],
              message: 'El dominio no puede depender de capas exteriores.',
            },
          ],
        },
      ],
    },
  },

  // --- application: solo dominio y sus propios puertos. ---
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FRAMEWORKS_PROHIBIDOS_EN_APLICACION,
          patterns: [
            {
              group: ['**/infrastructure/**', '**/interfaces/**', '**/main/**'],
              message:
                'Los casos de uso dependen de puertos. La implementacion se inyecta desde main/.',
            },
          ],
        },
      ],
    },
  },

  // --- interfaces (HTTP): habla con casos de uso, nunca con implementaciones. ---
  {
    files: ['src/interfaces/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**', '**/main/**'],
              message:
                'La capa HTTP recibe casos de uso por inyeccion; no construye infraestructura.',
            },
          ],
        },
      ],
    },
  },

  // --- infrastructure: implementa puertos. No conoce HTTP ni el arranque. ---
  {
    files: ['src/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/interfaces/**', '**/main/**'],
              message: 'La infraestructura no depende de la capa HTTP ni del arranque.',
            },
          ],
        },
      ],
    },
  },

  // El logger es el unico punto autorizado a escribir en consola.
  {
    files: ['src/shared/logging/**/*.ts', 'src/main/server.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  prettier,
)
