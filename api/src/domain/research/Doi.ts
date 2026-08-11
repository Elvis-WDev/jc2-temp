import { ValidationError } from '../../shared/errors/AppError.js'

/**
 * RN-009: el DOI se persiste normalizado, sin prefijo de URL ni esquema.
 *
 * Entradas aceptadas:
 *   https://doi.org/10.1016/j.x
 *   http://dx.doi.org/10.1016/j.x
 *   doi:10.1016/j.x
 *   10.1016/j.x
 * Persistencia: 10.1016/j.x
 *
 * Sin esto, el mismo trabajo introducido dos veces con formatos distintos pareceria
 * dos DOI diferentes, y cualquier busqueda o deduplicacion por DOI fallaria.
 */

/** Prefijo estructural de todo DOI: "10." seguido del registrante. */
const FORMA_DOI = /^10\.\d{4,9}\/\S+$/

const PREFIJOS = [
  'https://doi.org/',
  'http://doi.org/',
  'https://dx.doi.org/',
  'http://dx.doi.org/',
  'doi:',
  'DOI:',
]

export function normalizeDoi(entrada: string | null | undefined): string | null {
  if (entrada === null || entrada === undefined) return null

  let valor = entrada.trim()
  if (valor === '') return null

  for (const prefijo of PREFIJOS) {
    if (valor.toLowerCase().startsWith(prefijo.toLowerCase())) {
      valor = valor.slice(prefijo.length).trim()
      break
    }
  }

  // El registrante y el sufijo son sensibles a mayusculas en teoria, pero en la
  // practica los DOI se comparan en minusculas; normalizar evita duplicados.
  valor = valor.toLowerCase()

  if (!FORMA_DOI.test(valor)) {
    throw new ValidationError(
      'The DOI is not valid. Expected a form like 10.1016/j.example.2024.01.001.',
      { doi: 'Invalid DOI.' },
      'WORK_INVALID_DOI',
    )
  }

  return valor
}

/** URL canonica para mostrar o enlazar, derivada del valor normalizado. */
export function doiToUrl(doi: string): string {
  return `https://doi.org/${doi}`
}
