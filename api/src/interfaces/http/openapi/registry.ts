import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Habilita `.openapi()` sobre los esquemas Zod. Debe ejecutarse una sola vez y
// antes de que ningun modulo declare esquemas documentados.
extendZodWithOpenApi(z)

/**
 * Registro unico de OpenAPI (NFR-003).
 *
 * La documentacion se deriva de los mismos esquemas Zod que validan las peticiones,
 * de modo que no puede desincronizarse de la implementacion.
 */
export const registry = new OpenAPIRegistry()

export { z }
