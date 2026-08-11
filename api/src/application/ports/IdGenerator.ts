/**
 * Generacion de identificadores.
 *
 * Es un puerto para que los casos de uso sean deterministas en las pruebas: se
 * inyecta un generador fijo y el resultado deja de depender del azar.
 */
export interface IdGenerator {
  generate(): string
}
