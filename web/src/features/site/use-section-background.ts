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
 * El rotulo de una banda: el que el titular escribio, o el de la plantilla.
 *
 * El de la plantilla se queda en el frontend a proposito. Es parte del diseno, no
 * contenido, y guardarlo en la base obligaria a sembrar una fila por banda solo para
 * repetir lo que ya dice el codigo. Lo que se guarda es unicamente el cambio.
 */
export function useSectionHeading(
  clave: string,
  porDefecto: { title: string; aside?: string }
): { title: string; aside?: string } {
  const { data: site } = useQuery({
    queryKey: queryKeys.public.site,
    queryFn: getSite,
    staleTime: 5 * 60_000,
  })

  const escrito = site?.sectionHeadings[clave]
  return {
    title: escrito?.title ?? porDefecto.title,
    aside: escrito?.aside ?? porDefecto.aside,
  }
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
