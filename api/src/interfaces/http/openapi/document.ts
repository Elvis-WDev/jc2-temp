import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { env } from '../../../config/env.js'
import { registry } from './registry.js'

/**
 * Genera el documento OpenAPI 3.1 a partir de todo lo registrado (NFR-003).
 * Se llama despues de montar las rutas, cuando el registro ya esta completo.
 */
export function buildOpenApiDocument(): ReturnType<OpenApiGeneratorV31['generateDocument']> {
  const generator = new OpenApiGeneratorV31(registry.definitions)

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Academic Platform API',
      version: '0.1.0',
      description:
        'API de la plataforma academica personal. El prefijo /api/public es de solo lectura; /api/admin requiere sesion de administrador.',
    },
    servers: [{ url: env.PUBLIC_BASE_URL }],
  })
}
