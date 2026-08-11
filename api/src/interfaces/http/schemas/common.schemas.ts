import { registry, z } from '../openapi/registry.js'

/** Esquemas compartidos, registrados una sola vez y referenciados por el resto. */

export const errorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    error: z.object({
      code: z.string().openapi({ example: 'WORK_VALIDATION_ERROR' }),
      message: z.string().openapi({ example: 'The work could not be published.' }),
      fields: z.record(z.string(), z.string()).optional(),
      requestId: z.string(),
    }),
  }),
)

export const paginationSchema = registry.register(
  'Pagination',
  z.object({
    page: z.number().int().openapi({ example: 1 }),
    pageSize: z.number().int().openapi({ example: 20 }),
    totalItems: z.number().int().openapi({ example: 73 }),
    totalPages: z.number().int().openapi({ example: 4 }),
  }),
)

/**
 * Fecha de calendario: llega como `AAAA-MM-DD` y sale como `Date`.
 *
 * La conversion tiene que estar aqui, en el borde. Prisma espera un `Date` para una
 * columna `date` y rechaza una cadena suelta, asi que sin esto cualquier peticion que
 * llevara una fecha terminaba en 500: no se podia guardar la fecha de publicacion de un
 * trabajo, ni el periodo de una edicion de curso, ni el de una afiliacion.
 *
 * Se construye desde `AAAA-MM-DD`, que JavaScript interpreta en UTC, de modo que el dia
 * guardado es el que se escribio sea cual sea la zona horaria del servidor.
 */
export const calendarDateSchema = z
  // Se acepta tambien el instante ISO completo porque es lo que devuelven hoy las rutas
  // de administracion, que responden con el registro tal cual. Sin esto, un formulario
  // que cargue una fecha y la vuelva a guardar sin tocarla seria rechazado.
  .union([z.iso.date(), z.iso.datetime()])
  .transform((valor) => new Date(valor))

/** El camino de vuelta: `Date` a `AAAA-MM-DD`, para que leer y escribir usen lo mismo. */
export function toCalendarDate(fecha: Date | null): string | null {
  return fecha === null ? null : fecha.toISOString().slice(0, 10)
}

/**
 * Deriva el esquema de un PATCH a partir del de alta.
 *
 * Hace falta porque `.partial()` **no quita los valores por defecto**: un PATCH que no
 * menciona un campo con `.default()` lo recibe igualmente con ese valor, y termina
 * sobrescribiendo lo que hubiera guardado. Comprobado contra la base de datos: editar el
 * origen de un material dejaba `is_public` en falso y el material desaparecia de la web
 * sin que nadie lo hubiera ocultado.
 *
 * Un PATCH solo debe tocar lo que trae. Lo demas se queda como estaba.
 */
export function patchSchemaOf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const campos = Object.fromEntries(
    Object.entries(schema.shape).map(([nombre, campo]) => [
      nombre,
      campo instanceof z.ZodDefault ? (campo.def.innerType as z.ZodType) : campo,
    ]),
  )
  return z.object(campos).partial()
}

/** Respuestas de error reutilizables en cualquier ruta documentada. */
export function respuestaError(description: string) {
  return {
    description,
    content: { 'application/json': { schema: errorResponseSchema } },
  }
}
