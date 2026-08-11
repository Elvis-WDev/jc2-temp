import { type PublicCourseSummary, type PublicWorkSummary } from './api'

/** Como se escriben las publicaciones en el sitio. Sin JSX, para que se pueda reutilizar. */

/**
 * "with J. Perez and A. Soto", o "Sole author".
 *
 * El titular del sitio se descuenta: en su propia web, poner su nombre entre los
 * coautores de su propio trabajo sobra.
 */
export function coautores(autores: string[], titular: string | null): string {
  const otros =
    titular === null ? autores : autores.filter((autor) => autor !== titular)
  if (otros.length === 0) return 'Sole author'
  if (otros.length === 1) return `with ${otros[0]}`
  return `with ${otros.slice(0, -1).join(', ')} and ${otros[otros.length - 1]}`
}

/** "Revista, Vol. 139 (2)". Sin revista no hay linea que escribir. */
export function referencia(
  work: Pick<PublicWorkSummary, 'venue' | 'volume' | 'issue'>
): string | null {
  if (work.venue === null) return null

  const volumen = [
    work.volume === null ? null : `Vol. ${work.volume}`,
    work.issue === null ? null : `(${work.issue})`,
  ]
    .filter((parte) => parte !== null)
    .join(' ')

  return volumen === '' ? work.venue : `${work.venue}, ${volumen}`
}

/** "Autumn 2024", o solo el ano, o nada. */
export function periodo(
  edicion: PublicCourseSummary['currentOffering']
): string | null {
  if (edicion === null) return null
  const partes = [edicion.term, edicion.academicYear].filter(Boolean)
  return partes.length === 0 ? null : partes.join(' ')
}
