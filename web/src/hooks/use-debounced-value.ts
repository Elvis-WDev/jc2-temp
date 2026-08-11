import { useEffect, useState } from 'react'

/**
 * Retrasa un valor hasta que deja de cambiar durante `delay` milisegundos.
 *
 * Se usa en las busquedas de texto contra el servidor: sin esto, cada pulsacion
 * dispararia una peticion. `data-tables.md:44` pide justo esto para el texto libre, y
 * NO para los selectores acotados, donde el retraso solo se percibe como lentitud.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const temporizador = setTimeout(() => {
      setDebounced(value)
    }, delay)

    return () => {
      clearTimeout(temporizador)
    }
  }, [value, delay])

  return debounced
}
