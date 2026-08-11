import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/query-keys'
import { type StatusTone } from '@/components/status-badge'
import {
  listAcademicStatuses,
  type AcademicStatus,
  type Tono,
} from '@/features/academic-statuses/api'

/**
 * Estados académicos para los desplegables y las tablas.
 *
 * Antes la etiqueta y el color estaban en dos mapas escritos a mano; con estados que
 * crea el titular, esos mapas no podrían cubrir uno nuevo. Ahora vienen con el estado.
 */
export function useAcademicStatuses(activeOnly = false) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.academicStatuses.list(activeOnly),
    queryFn: () => listAcademicStatuses(activeOnly),
  })

  const estados = data ?? []

  return {
    estados,
    isLoading,
    /** Cómo se lee un código; si no está, el propio código, que es información real. */
    etiqueta: (code: string): string =>
      estados.find((estado) => estado.code === code)?.label ?? code,
    /** Con qué color se pinta; gris si el estado ya no existe. */
    tono: (code: string): StatusTone =>
      (estados.find((estado) => estado.code === code)?.tone ??
        'neutral') as StatusTone,
  }
}

/** Añade el valor guardado si ya no figura, para no perderlo al guardar. */
export function conEstadoActual(
  estados: AcademicStatus[],
  actual: string
): Array<{ code: string; label: string; tone: Tono }> {
  const opciones = estados.map((estado) => ({
    code: estado.code,
    label: estado.label,
    tone: estado.tone,
  }))
  if (actual !== '' && !opciones.some((opcion) => opcion.code === actual)) {
    opciones.push({ code: actual, label: actual, tone: 'neutral' })
  }
  return opciones
}
