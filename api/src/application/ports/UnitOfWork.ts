/**
 * Puerto de transaccion (ERS §49).
 *
 * Las operaciones compuestas (crear un work con autores, tags, links y archivos)
 * se ejecutan dentro de `run`: si cualquier paso falla, se revierte todo.
 *
 * El generico `TContext` lo concreta la infraestructura con su propio cliente
 * transaccional, de forma que la capa de aplicacion no nombra a Prisma.
 */
export interface UnitOfWork<TContext = unknown> {
  run<T>(work: (context: TContext) => Promise<T>): Promise<T>
}
