/**
 * Choque con una restriccion unica de PostgreSQL, tal como lo cuenta Prisma.
 *
 * Se mira la forma del error en vez de importar el cliente: esto lo usan el dominio y la
 * capa de aplicacion, que no conocen la infraestructura. El precio es una comprobacion
 * por pato, y a cambio no hay una dependencia de Prisma cruzando las capas.
 */
export function esColisionDeUnico(error: unknown, columna?: string): boolean {
  const posible = error as { code?: unknown; meta?: unknown } | null
  if (posible?.code !== 'P2002') return false
  if (columna === undefined) return true

  // Que columna choca no viene en un sitio fijo: con el adaptador de driver que usa este
  // proyecto llega en `meta.driverAdapterError.cause.constraint.fields`, y en otras
  // configuraciones en `meta.target`. Se busca el nombre dentro de todo `meta`, que
  // funciona con cualquiera de las dos formas.
  return JSON.stringify(posible.meta ?? '').includes(`"${columna}"`)
}
