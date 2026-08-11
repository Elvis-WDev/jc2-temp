import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/query-keys'
import {
  listCatalogTerms,
  type Catalog,
  type CatalogTerm,
} from '@/features/catalogs/api'

/**
 * Opciones de un vocabulario, para los desplegables del panel.
 *
 * Solo trae los términos visibles: uno oculto deja de ofrecerse en los formularios pero
 * no desaparece de lo que ya lo usa.
 */
export function useCatalogTerms(catalog: Catalog) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.catalogTerms.list(catalog, true),
    queryFn: () => listCatalogTerms(catalog, true),
  })

  const terminos = data ?? []

  return {
    terminos,
    isLoading,
    /**
     * Cómo se lee un código guardado.
     *
     * Si no hay término —porque se ocultó, se borró o el valor vino de otro sistema— se
     * devuelve el código tal cual en lugar de una celda vacía: es información real y
     * seguir viéndola es mejor que perderla de vista.
     */
    etiqueta: (code: string): string =>
      terminos.find((termino) => termino.code === code)?.label ?? code,
  }
}

/**
 * Añade el valor actual a la lista si no está.
 *
 * Sin esto, abrir un registro cuyo tipo se ocultó haría que el desplegable apareciera
 * vacío y al guardar se perdería el valor sin que nadie lo pidiera.
 */
export function conValorActual(
  terminos: CatalogTerm[],
  actual: string
): Array<{ code: string; label: string }> {
  const opciones = terminos.map((termino) => ({
    code: termino.code,
    label: termino.label,
  }))
  if (actual !== '' && !opciones.some((opcion) => opcion.code === actual)) {
    opciones.push({ code: actual, label: actual })
  }
  return opciones
}
