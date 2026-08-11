import { useCallback, useSyncExternalStore } from 'react'

/**
 * Orden personalizado del menu, recordado entre sesiones.
 *
 * Se guarda en el navegador, no en el servidor: es una preferencia de quien usa el
 * equipo, no un dato del sitio.
 *
 * Se almacenan titulos, no posiciones. Asi, si mas adelante se anaden o quitan
 * entradas del menu, el orden guardado sigue siendo valido para las que quedan en vez
 * de descolocarlo todo.
 */
const CLAVE = 'jc2.sidebar-order'

type Orden = Record<string, string[]>

function leer(): Orden {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return guardado === null ? {} : (JSON.parse(guardado) as Orden)
  } catch {
    // Si el contenido esta corrupto, se ignora y se usa el orden por defecto.
    return {}
  }
}

let cache: Orden = leer()
const suscriptores = new Set<() => void>()

function notificar() {
  cache = leer()
  for (const suscriptor of suscriptores) suscriptor()
}

function suscribir(callback: () => void) {
  suscriptores.add(callback)
  return () => {
    suscriptores.delete(callback)
  }
}

/**
 * Aplica un orden guardado a una lista.
 *
 * Lo que no aparezca en el orden guardado va al final, conservando su posicion
 * original: una entrada nueva del menu no desaparece por no estar en la preferencia.
 */
export function aplicarOrden<T extends { title: string }>(
  guardado: string[] | undefined,
  items: T[]
): T[] {
  if (guardado === undefined) return items

  const posicion = new Map(guardado.map((titulo, indice) => [titulo, indice]))
  return [...items].sort((a, b) => {
    const pa = posicion.get(a.title) ?? Number.MAX_SAFE_INTEGER
    const pb = posicion.get(b.title) ?? Number.MAX_SAFE_INTEGER
    return pa - pb
  })
}

export function useSidebarOrder() {
  const orden = useSyncExternalStore(
    suscribir,
    () => cache,
    () => ({}) as Orden
  )

  const guardar = useCallback((grupo: string, titulos: string[]) => {
    const actualizado = { ...leer(), [grupo]: titulos }
    localStorage.setItem(CLAVE, JSON.stringify(actualizado))
    notificar()
  }, [])

  const restablecer = useCallback(() => {
    localStorage.removeItem(CLAVE)
    notificar()
  }, [])

  const ordenar = useCallback(
    <T extends { title: string }>(grupo: string, items: T[]): T[] =>
      aplicarOrden(orden[grupo], items),
    [orden]
  )

  // Derivado del propio estado, no leido del almacen a mano: asi el boton de
  // restablecer aparece y desaparece solo al reordenar.
  const hayOrdenPersonalizado = Object.keys(orden).length > 0

  return { ordenar, guardar, restablecer, hayOrdenPersonalizado }
}
