import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api/query-keys'
import { getSite } from './api'

/**
 * El fondo que el titular eligio para una seccion, o `null` si no eligio ninguno.
 *
 * La clave es la misma que la de visibilidad: `home.hero`, `research.header`. Sale de
 * `/api/public/site`, que todas las paginas piden igualmente para el menu y el pie, asi
 * que preguntar por el fondo no anade ninguna peticion.
 */
export function useSectionBackground(clave: string): {
  url: string
  overlay: number
} | null {
  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  return site?.sectionBackgrounds[clave] ?? null
}

/**
 * Las clases de texto de una banda, segun lleve foto detras o no.
 *
 * Sobre una foto oscurecida el texto oscuro deja de leerse, asi que la banda entera se
 * invierte. El acento cambia de tono ademas de color: el terracota oscuro (#713618) esta
 * elegido para fondo claro, y sobre oscuro el que llega a contraste es el claro.
 */
export function tonoDeBanda(sobreImagen: boolean) {
  return {
    titulo: sobreImagen ? 'text-site-on-primary' : 'text-site-on-surface',
    cuerpo: sobreImagen
      ? 'text-site-on-primary/85'
      : 'text-site-on-surface-variant',
    meta: sobreImagen
      ? 'text-site-on-primary/70'
      : 'text-site-on-surface-variant',
    acento: sobreImagen
      ? 'text-site-on-tertiary-container'
      : 'text-site-on-tertiary-fixed-variant',
  }
}
