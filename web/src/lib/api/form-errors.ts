import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { ApiError } from './api-error'

/**
 * Vuelca los errores de campo de la API en react-hook-form.
 *
 * El backend responde 422 con `fields: { authors: "At least one author is required." }`
 * (ERS §48). Sin esto, ese detalle acabaria en un toast generico y el usuario tendria
 * que adivinar que campo corregir.
 *
 * Devuelve true si consumio el error, para que quien llama sepa si aun debe mostrar
 * algo mas.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown
): boolean {
  if (!(error instanceof ApiError) || !error.hasFieldErrors) return false

  const camposDelFormulario = Object.keys(form.getValues())
  let alguno = false

  for (const [campo, mensaje] of Object.entries(error.fields)) {
    if (camposDelFormulario.includes(campo)) {
      form.setError(campo as Path<T>, { type: 'server', message: mensaje })
      alguno = true
    }
  }

  // Un campo que la API nombra pero el formulario no tiene (por ejemplo `existingTagId`)
  // no se pierde: se muestra a nivel de formulario.
  if (!alguno) {
    const primero = Object.values(error.fields)[0]
    if (primero !== undefined) {
      form.setError('root', { type: 'server', message: primero })
    }
  }

  return true
}
